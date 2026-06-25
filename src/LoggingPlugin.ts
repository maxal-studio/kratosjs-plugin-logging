import { Plugin, Panel, ResourceClass, HookContext, MikroOrmAdapter, MediaHookContext } from '@maxal_studio/kratosjs';
import { createLogEntity, type ILog } from './entities/Log';
import type { EntitySchema } from '@mikro-orm/core';
import { LoggerResource } from './LoggerResource';
import { Migration20250103000001CreateLogTable } from './migrations/sql/Migration20250103000001CreateLogTable';
import en from './lang/en';
import sq from './lang/sq';

/**
 * Logging Plugin — records resource operations to the database.
 * Driver-agnostic: builds the Log entity for the active driver and only
 * registers SQL migrations on SQL drivers (MongoDB creates collections lazily).
 */
export class LoggingPlugin extends Plugin {
	private logEntity!: EntitySchema<ILog>;

	getName(): string {
		return 'logging';
	}

	async register(panel: Panel): Promise<void> {
		const driver = panel.getDriverKind();
		const Log = createLogEntity(driver);
		this.logEntity = Log;

		panel.registerTranslations('logging', { en, sq });

		panel.registerEntities([Log]);
		if (driver === 'sql') {
			panel.registerMigrations([Migration20250103000001CreateLogTable]);
		}

		LoggerResource.entity = Log;
		panel.registerResource(LoggerResource);

		for (const [_slug, registered] of panel.getResources()) {
			const ResourceClass = registered.resourceClass;
			if (ResourceClass === LoggerResource) continue;
			panel.registerResourceHooks(ResourceClass, this.createLoggingHooks(ResourceClass));
		}

		// Media uploads/deletes don't flow through resource CRUD, so log them via
		// the panel's media lifecycle hooks.
		panel.registerMediaHooks({
			afterMediaUpload: [async (ctx: MediaHookContext) => this.logMedia(panel, ctx, 'upload')],
			afterMediaDelete: [async (ctx: MediaHookContext) => this.logMedia(panel, ctx, 'delete')],
			onMediaError: [async (ctx: MediaHookContext) => this.logMediaError(panel, ctx)],
		});
	}

	private createLoggingHooks(ResourceClass: ResourceClass) {
		const resourceSlug = ResourceClass.getSlug();
		return {
			afterCreate: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'create')],
			afterUpdate: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'update')],
			afterDelete: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'delete')],
			afterList: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'list')],
			afterListRelated: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'listRelated')],
			afterFindById: [async (ctx: HookContext) => this.logOperation(ctx, resourceSlug, 'findById')],
			afterAction: [async (ctx: HookContext) => this.logAction(ctx, resourceSlug)],
			onError: [async (ctx: HookContext) => this.logError(ctx, resourceSlug)],
		};
	}

	private getEm(ctx: HookContext) {
		return (ctx.adapter as MikroOrmAdapter).getEm();
	}

	private recordIdFrom(ctx: HookContext): string | undefined {
		if (ctx.input.ids?.length) return String(ctx.input.ids[0]);
		const record = ctx.output.records?.[0];
		if (!record) return undefined;
		return String(record.id ?? record._id ?? '');
	}

	private async logOperation(
		ctx: HookContext,
		resourceSlug: string,
		operation: 'create' | 'update' | 'delete' | 'list' | 'listRelated' | 'findById',
	): Promise<void> {
		try {
			const em = this.getEm(ctx);
			em.create(this.logEntity, {
				resource: resourceSlug,
				operation,
				recordId: this.recordIdFrom(ctx),
				userId: ctx.user?.id ? String(ctx.user.id) : undefined,
				timestamp: new Date(),
				data: ctx.output.records,
			} as any);
			await em.flush();
		} catch (error) {
			console.error('[LoggingPlugin] Failed to log operation:', error);
		}
	}

	private async logAction(ctx: HookContext, resourceSlug: string): Promise<void> {
		try {
			const em = this.getEm(ctx);
			em.create(this.logEntity, {
				resource: resourceSlug,
				operation: 'action',
				recordId: this.recordIdFrom(ctx),
				userId: ctx.user?.id ? String(ctx.user.id) : undefined,
				timestamp: new Date(),
				data: {
					action: ctx.action?.name,
					formData: ctx.action?.formData,
					result: ctx.output.action,
				},
			} as any);
			await em.flush();
		} catch (error) {
			console.error('[LoggingPlugin] Failed to log action:', error);
		}
	}

	private async logError(ctx: HookContext, resourceSlug: string): Promise<void> {
		try {
			const em = this.getEm(ctx);
			em.create(this.logEntity, {
				resource: resourceSlug,
				operation: ctx.operation,
				recordId: this.recordIdFrom(ctx),
				userId: ctx.user?.id ? String(ctx.user.id) : undefined,
				timestamp: new Date(),
				error: {
					name: ctx.error?.name || 'Error',
					message: ctx.error?.message || 'Unknown error',
					stack: ctx.error?.stack,
				},
				input: ctx.input,
			} as any);
			await em.flush();
		} catch (error) {
			console.error('[LoggingPlugin] Failed to log error:', error);
		}
	}

	private async logMedia(panel: Panel, ctx: MediaHookContext, operation: 'upload' | 'delete'): Promise<void> {
		try {
			// Media hooks have no ctx.adapter (they aren't entity-scoped); use a
			// forked EM off the panel. Media routes run inside the request's ORM context.
			const em = panel.getEm().fork();
			em.create(this.logEntity, {
				resource: ctx.resourceSlug ?? 'media',
				operation: `media.${operation}`,
				recordId: ctx.result?.key ?? ctx.key,
				userId: ctx.user?.id ? String(ctx.user.id) : undefined,
				timestamp: new Date(),
				data: {
					filename: ctx.filename,
					path: ctx.path,
					contentType: ctx.contentType,
					bucket: ctx.result?.bucket ?? ctx.bucket,
					key: ctx.result?.key ?? ctx.key,
					url: ctx.result?.url,
					fieldName: ctx.fieldName,
				},
			} as any);
			await em.flush();
		} catch (error) {
			console.error('[LoggingPlugin] Failed to log media:', error);
		}
	}

	private async logMediaError(panel: Panel, ctx: MediaHookContext): Promise<void> {
		try {
			const em = panel.getEm().fork();
			em.create(this.logEntity, {
				resource: ctx.resourceSlug ?? 'media',
				operation: 'media.error',
				recordId: ctx.result?.key ?? ctx.key,
				userId: ctx.user?.id ? String(ctx.user.id) : undefined,
				timestamp: new Date(),
				error: {
					name: ctx.error?.name || 'Error',
					message: ctx.error?.message || 'Unknown error',
					stack: ctx.error?.stack,
				},
				data: {
					operation: ctx.operation,
					filename: ctx.filename,
					key: ctx.key,
					fieldName: ctx.fieldName,
				},
			} as any);
			await em.flush();
		} catch (error) {
			console.error('[LoggingPlugin] Failed to log media error:', error);
		}
	}
}
