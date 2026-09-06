import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { TraderProfile } from "./trader-profile.entity.js";

@Entity("trader_follows")
@Unique(["followerId", "traderId"])
export class TraderFollow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  followerId!: string;

  @Column({ type: "uuid" })
  traderId!: string;

  @ManyToOne(() => TraderProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "traderId" })
  trader!: TraderProfile;

  @CreateDateColumn()
  createdAt!: Date;
}
