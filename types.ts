import { ObjectId, OptionalId } from "mongodb";
export type ContactModel = OptionalId<{
  name: string;
  phone: string;
  hobbies: ObjectId[];
}>;

export type HobbyModel = OptionalId<{
  description: string;
}>;

export type Contact = {
  id: string;
  name: string;
  phone: string;
  country: string;
  hobbies: Hobby[];
};

export type Hobby = {
  id: string;
  description: string;
};
