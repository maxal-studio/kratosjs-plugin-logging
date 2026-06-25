import {
	BaseResource,
	FormBuilder,
	TextInput,
	Textarea,
	TableBuilder,
	TextColumn,
	BadgeColumn,
	DateFilter,
	equalsRule,
	isNotNullRule,
	t,
} from '@maxal_studio/kratosjs';

export class LoggerResource extends BaseResource {
	static slug = 'logs';
	// Assigned by LoggingPlugin.register() — the Log entity is built per driver
	static entity: any;
	static icon = 'FileText';
	static canCreate = false;
	static canEdit = false;
	static canDelete = false;

	static get navigationGroup() {
		return t('logging:navGroup');
	}

	static get label() {
		return t('logging:label');
	}

	static get pluralLabel() {
		return t('logging:plural');
	}

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('resource').label(t('logging:field.resource')).readOnly(),
			TextInput.make('operation').label(t('logging:field.operation')).readOnly(),
			TextInput.make('recordId').label(t('logging:field.record_id')).readOnly(),
			TextInput.make('userId').label(t('logging:field.user_id')).readOnly(),
			TextInput.make('timestamp').label(t('logging:field.timestamp')).readOnly(),
			Textarea.make('data').label(t('logging:field.data')).readOnly().rows(10),
			Textarea.make('error').label(t('logging:field.error')).readOnly().rows(5),
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([
				TextColumn.make('resource').label(t('logging:field.resource')).sortable(),
				TextColumn.make('operation').label(t('logging:field.operation')).sortable(),
				BadgeColumn.make('error')
					.label(t('logging:column.status'))
					.formatStateUsing((value: any) => {
						const hasError = value !== null && value !== undefined && value !== false;
						return hasError ? 'Error' : 'Success';
					})
					.color((value: any) => {
						const hasError = value !== null && value !== undefined && value !== false;
						return hasError ? 'danger' : 'success';
					}),
				TextColumn.make('error')
					.label(t('logging:column.error_message'))
					.formatStateUsing((_value: any, row: any) => row.error?.message || row.error || '')
					.sortable(),
				TextColumn.make('recordId').label(t('logging:field.record_id')).sortable(),
				TextColumn.make('userId').label(t('logging:field.user_id')).sortable(),
				TextColumn.make('timestamp').label(t('logging:field.timestamp')).sortable(),
			])
			.filters([
				DateFilter.make('timestamp').label(t('logging:filter.timestamp')).placeholder('Select date range...'),
			])
			.defaultSort('timestamp', 'desc')
			.tabs([
				{
					key: 'error',
					label: t('logging:tab.error'),
					icon: 'AlertCircle',
					queryBuilder: [isNotNullRule('error')],
				},
				{
					key: 'findById',
					label: t('logging:tab.find_by_id'),
					icon: 'CheckCircle',
					queryBuilder: [equalsRule('operation', 'findById', 'text')],
				},
				{
					key: 'list',
					label: t('logging:tab.list'),
					icon: 'List',
					queryBuilder: [equalsRule('operation', 'list', 'text')],
				},
				{
					key: 'listRelated',
					label: t('logging:tab.list_related'),
					icon: 'ListTree',
					queryBuilder: [equalsRule('operation', 'listRelated', 'text')],
				},
				{
					key: 'action',
					label: t('logging:tab.action'),
					icon: 'Zap',
					queryBuilder: [equalsRule('operation', 'action', 'text')],
				},
				{
					key: 'create',
					label: t('logging:tab.create'),
					icon: 'Plus',
					queryBuilder: [equalsRule('operation', 'create', 'text')],
				},
				{
					key: 'update',
					label: t('logging:tab.update'),
					icon: 'Pencil',
					queryBuilder: [equalsRule('operation', 'update', 'text')],
				},
				{
					key: 'delete',
					label: t('logging:tab.delete'),
					icon: 'Trash',
					queryBuilder: [equalsRule('operation', 'delete', 'text')],
				},
				{
					key: 'media.upload',
					label: t('logging:tab.media_upload'),
					icon: 'Upload',
					queryBuilder: [equalsRule('operation', 'media.upload', 'text')],
				},
				{
					key: 'media.delete',
					label: t('logging:tab.media_delete'),
					icon: 'FileX',
					queryBuilder: [equalsRule('operation', 'media.delete', 'text')],
				},
			]);
	}
}
