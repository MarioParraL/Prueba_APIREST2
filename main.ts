import { MongoClient } from "mongodb";
import { ContactModel, HobbyModel } from "./types.ts";
import { fromModelToContact, fromModelToHobby } from "./utils.ts";
import { ObjectId } from "mongodb";
import { load } from "https://deno.land/std@0.204.0/dotenv/mod.ts";

const env = await load();
const MONGO_URL = env.MONGO_URL || Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.error("Need a MONGO_URL");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");
const db = client.db("APruebaAR2");
const contactsCollection = db.collection<ContactModel>("usuarios");
const hobbiesCollection = db.collection<HobbyModel>("libros");

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") {
    if (path === "/contacts") {
      const name = url.searchParams.get("name");
      if (name) {
        const contactsDB = await contactsCollection.find({ name }).toArray();
        const contacts = await Promise.all(
          contactsDB.map((c) => fromModelToContact(c, hobbiesCollection)),
        );
        return new Response(JSON.stringify(contacts));
      } else {
        const contactsDB = await contactsCollection.find().toArray();
        const contacts = await Promise.all(
          contactsDB.map((c) => fromModelToContact(c, hobbiesCollection)),
        );
        return new Response(JSON.stringify(contacts));
      }
    } else if (path === "/contact") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Bad request", { status: 400 });
      const contactDB = await contactsCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!contactDB) return new Response("Not found", { status: 404 });
      const contact = await fromModelToContact(contactDB, hobbiesCollection);
      return new Response(JSON.stringify(contact));
    } else if (path === "/hobbies") {
      const hobbiesDB = await hobbiesCollection.find().toArray();
      const hoobies = hobbiesDB.map((h) => fromModelToHobby(h));
      return new Response(JSON.stringify(hoobies));
    } else if (path === "/hobby") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Bad request", { status: 400 });

      const hoobyDB = await hobbiesCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!hoobyDB) throw new Response("Hobby not found", { status: 404 });

      const hobby = fromModelToHobby(hoobyDB);
      return new Response(JSON.stringify(hobby));
    }
  } else if (method === "POST") {
    if (path === "/contact") {
      const contact = await req.json();
      if (!contact.name || !contact.phone) {
        throw new Response("Bad request", { status: 400 });
      }

      const phoneExists = await contactsCollection.findOne({
        phone: contact.phone,
      });

      if (phoneExists) throw new Response("User already exists");

      const { insertedId } = await contactsCollection.insertOne({
        name: contact.name,
        phone: contact.phone,
        hobbies: contact.hobbies.map((id: string) => new ObjectId(id)),
      });

      return new Response(
        JSON.stringify({
          id: insertedId,
          name: contact.name,
          phone: contact.phone,
          country: contact.country,
          hoobies: contact.hobbies.map((id: string) => new ObjectId(id)),
        }),
        { status: 200 },
      );
    } else if (path === "/hobby") {
      const hobby = await req.json();
      if (!hobby.description) {
        return new Response("Bad request", { status: 400 });
      }

      const { insertedId } = await hobbiesCollection.insertOne({
        description: hobby.description,
      });

      return new Response(
        JSON.stringify({
          id: insertedId,
          description: hobby.description,
        }),
        { status: 200 },
      );
    }
  } else if (method === "PUT") {
    if (path === "/contact") {
      const contact = await req.json();
      if (!contact.name || !contact.phone || !contact.hobbies) {
        return new Response("Bad request", { status: 400 });
      }

      if (contact.hobbies) {
        const hobbies = await hobbiesCollection.find({
          _id: { $in: contact.hobbies.map((id: string) => new ObjectId(id)) },
        }).toArray();

        if (hobbies.length !== contact.hobbies.length) {
          throw new Response("Bad reques", { status: 404 });
        }
      }

      const { modifiedCount } = await contactsCollection.updateOne(
        { phone: contact.phone },
        {
          $set: {
            name: contact.name,
            phone: contact.phone,
            hobbies: contact.hobbies,
          },
        },
      );

      if (modifiedCount === 0) {
        return new Response("Contact not found", { status: 404 });
      }
      return new Response("OK", { status: 200 });
    } else if (path === "/hobby") {
      const hobby = await req.json();
      if (!hobby.description) {
        throw new Response("Bad request", { status: 404 });
      }

      const { modifiedCount } = await hobbiesCollection.updateOne(
        { _id: new ObjectId(hobby.id as string) },
        { $set: { description: hobby.description } },
      );

      if (modifiedCount === 0) {
        return new Response("Hobby not found", { status: 404 });
      }
      return new Response("OK", { status: 200 });
    }
  } else if (method === "DELETE") {
    if (path === "/contact") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Bad request", { status: 400 });

      const { deletedCount } = await contactsCollection.deleteOne(
        { _id: new ObjectId(id) },
      );

      if (deletedCount === 0) throw new Response("Contact not found");
      return new Response("OK", { status: 200 });
    } else if (path === "/hobby") {
      const id = url.searchParams.get("id");
      if (!id) return new Response("Bad request", { status: 404 });

      const { deletedCount } = await hobbiesCollection.deleteOne(
        { _id: new ObjectId(id) },
      );

      if (deletedCount === 0) {
        throw new Response("Hobby not found", { status: 404 });
      }

      await contactsCollection.updateMany(
        { hobbies: new ObjectId(id) },
        { $pull: { hobbies: new ObjectId(id) } },
      );
      return new Response("OK", { status: 200 });
    }
  }

  return new Response("Endpoint not found");
};

Deno.serve({ port: 3000 }, handler);
