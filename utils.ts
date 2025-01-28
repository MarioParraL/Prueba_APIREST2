import { Collection } from "mongodb";
import { Contact, ContactModel, Hobby, HobbyModel } from "./types.ts";

export const fromModelToContact = async (
  model: ContactModel,
  hobbyCollection: Collection<HobbyModel>,
): Promise<Contact> => {
  const hobbies = await hobbyCollection.find({
    _id: { $in: model.hobbies },
  }).toArray();

  const API_KEY = Deno.env.get("API_KEY");
  if (!API_KEY) throw new Error("Need an API_KEY");

  const url =
    `https://api.api-ninjas.com/v1/validatephone?number=${model.phone}`;
  const data = await fetch(url, {
    headers: {
      "X-API-KEY": API_KEY,
    },
  });

  if (data.status !== 200) throw new Error("API NINJA ERROR");

  const response = await data.json();
  const country = response.country;

  return ({
    id: model._id!.toString(),
    name: model.name,
    phone: model.phone,
    country: country,
    hobbies: hobbies.map((h) => fromModelToHobby(h)),
  });
};

export const fromModelToHobby = (model: HobbyModel): Hobby => ({
  id: model._id!.toString(),
  description: model.description,
});
