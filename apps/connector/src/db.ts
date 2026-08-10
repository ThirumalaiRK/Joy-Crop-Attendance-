import { DataSource, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DeviceCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  ip!: string;

  @Column()
  port!: number;

  @Column({ nullable: true })
  sn!: string;

  @Column({ nullable: true })
  deviceName!: string;

  @Column({ default: true })
  online!: boolean;
}

@Entity()
export class AttendanceCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userSn!: string;

  @Column()
  deviceUserId!: string;

  @Column()
  recordTime!: string;

  @Column()
  ip!: string;

  @Column({ default: false })
  synced!: boolean;
}

@Entity()
export class UserCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  deviceUserId!: string;

  @Column()
  name!: string;

  @Column()
  role!: number;

  @Column()
  ip!: string;

  @Column({ default: false })
  synced!: boolean;
}

@Entity()
export class OfflineBacklog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  device_ip!: string;

  @Column()
  device_user_id!: string;

  @Column()
  event_time!: string;

  @Column({ nullable: true })
  verification_type!: string;

  @Column({ nullable: true })
  device_name!: string;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ default: 0 })
  retry_count!: number;

  @Column()
  created_at!: string;
}

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'connector_data.sqlite',
  synchronize: true,
  logging: false,
  entities: [DeviceCache, AttendanceCache, UserCache, OfflineBacklog],
  subscribers: [],
  migrations: [],
});

export const initializeDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
};
