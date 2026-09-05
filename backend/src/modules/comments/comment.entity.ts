import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../auth/user.entity.js";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  marketId!: string;

  @Column({ type: "uuid", nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({ type: "varchar", length: 100 })
  authorName!: string;

  @Column({ type: "text" })
  text!: string;

  @Column({ type: "int", default: 0 })
  likes!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
