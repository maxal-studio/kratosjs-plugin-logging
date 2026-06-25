import { Migration } from '@mikro-orm/migrations';

/**
 * Logging plugin migration — creates the `log` table for operation audit records.
 */
export class Migration20250103000001CreateLogTable extends Migration {
	async up(): Promise<void> {
		this.addSql(`
			create table if not exists \`log\` (
				\`id\` int unsigned not null auto_increment primary key,
				\`resource\` varchar(255) not null,
				\`operation\` varchar(50) not null,
				\`record_id\` varchar(255) null,
				\`user_id\` varchar(255) null,
				\`timestamp\` datetime not null,
				\`data\` json null,
				\`error\` json null,
				\`input\` json null,
				index \`log_resource_timestamp_index\` (\`resource\`, \`timestamp\`),
				index \`log_operation_timestamp_index\` (\`operation\`, \`timestamp\`)
			) default character set utf8mb4 engine = InnoDB;
		`);
	}

	async down(): Promise<void> {
		this.addSql('drop table if exists `log`;');
	}
}
