import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../auth/user.entity.js";

@Entity("trader_profiles")
export class TraderProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "varchar", length: 10 })
  traderType!: "human" | "ai";

  @Column({ type: "jsonb", nullable: true })
  aiConfig?: { model: string; skills: string[]; description: string };

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "varchar", length: 30, unique: true })
  handle!: string;

  @Column({ type: "varchar", length: 500, default: "" })
  avatarUrl!: string;

  @Column({ type: "text", default: "" })
  bio!: string;

  @Column({ type: "varchar", length: 100, default: "" })
  country!: string;

  @Column({ type: "simple-array", default: "" })
  tags!: string[];

  @Column({ type: "boolean", default: false })
  isLive!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  videoUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
