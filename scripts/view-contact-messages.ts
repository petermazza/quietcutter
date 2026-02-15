// Script to view contact form messages from the database
import { db } from "../server/db";
import { contactMessages } from "../shared/schema";
import { desc } from "drizzle-orm";

async function viewContactMessages() {
  try {
    console.log("Fetching contact messages...\n");
    
    const messages = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    if (messages.length === 0) {
      console.log("No contact messages found.");
      return;
    }

    console.log(`Found ${messages.length} contact message(s):\n`);
    console.log("=".repeat(80));

    messages.forEach((msg, index) => {
      console.log(`\n[${index + 1}] Message ID: ${msg.id}`);
      console.log(`Date: ${msg.createdAt}`);
      console.log(`From: ${msg.name} <${msg.email}>`);
      console.log(`Subject: ${msg.subject}`);
      console.log(`Message:\n${msg.message}`);
      console.log("=".repeat(80));
    });

    process.exit(0);
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    process.exit(1);
  }
}

viewContactMessages();
