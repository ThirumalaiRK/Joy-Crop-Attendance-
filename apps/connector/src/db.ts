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

  /**
   * Raw machine timestamp string exactly as received from device
   * e.g. "2026-08-13 09:20:59"
   * NEVER store a UTC or server timestamp here.
   */
  @Column()
  recordTime!: string;

  /**
   * machine_timestamp preserves the exact device local string (IST).
   * Kept separately from recordTime for clarity.
   */
  @Column({ nullable: true })
  machineTimestamp!: string;

  @Column({ nullable: true })
  machineLogId!: string;

  @Column({ type: 'text', nullable: true })
  rawPayload!: string;

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

  /**
   * Exact machine timestamp string preserved (IST) e.g. "2026-08-13 09:20:59"
   * Used to reconstruct biometric_raw_punches on reconnect.
   */
  @Column()
  machine_timestamp!: string;

  /** UTC equivalent of machine_timestamp — for ordering only */
  @Column({ nullable: true })
  event_time_utc!: string;

  @Column({ nullable: true })
  machine_log_id!: string;

  @Column({ nullable: true })
  verification_type!: string;

  @Column({ nullable: true })
  device_name!: string;

  @Column({ type: 'text', nullable: true })
  raw_payload!: string;

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
