import { EntitySchema } from '@mikro-orm/core';
import { idProps, DriverKind } from '@maxal_studio/kratosjs';

export interface ILog {
	id: number | string;
	resource: string;
	operation: string;
	recordId?: string;
	userId?: string;
	timestamp: Date;
	data?: unknown;
	error?: unknown;
	input?: unknown;
}

/**
 * Build the Log entity for the active database driver.
 */
export function createLogEntity(driver: DriverKind): EntitySchema<ILog> {
	return new EntitySchema<ILog>({
		name: 'Log',
		properties: {
			...idProps(driver),
			resource: { type: 'string' },
			operation: { type: 'string' },
			recordId: { type: 'string', nullable: true },
			userId: { type: 'string', nullable: true },
			timestamp: { type: 'Date', onCreate: () => new Date() },
			data: { type: 'json', nullable: true },
			error: { type: 'json', nullable: true },
			input: { type: 'json', nullable: true },
		} as any,
	});
}
