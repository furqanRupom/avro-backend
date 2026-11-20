import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../enums/role.enum';

@Schema({ _id: false })
export class Address {
  @Prop({ type: String, default: '' })
  division: string;

  @Prop({ type: String, default: '' })
  district: string;

  @Prop({ type: String, default: '' })
  area: string;

  @Prop({ type: String, default: '' })
  street: string;

  @Prop({ type: String, default: '' })
  postalCode: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, default: '', trim: true })
  phone: string;

  @Prop({
    type: String,
    enum: Role,
    default: Role.CUSTOMER,
  })
  role: Role;

  @Prop({ type: AddressSchema, default: () => ({}) })
  address: Address;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
