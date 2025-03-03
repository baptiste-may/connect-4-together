import {Schema, type} from "@colyseus/schema";

/**
 * Represents a chat message with content and author information.
 */
export class ChatMessage extends Schema {
    @type("string") content;
    @type("string") author;

    /**
     * Initializes a new instance of the ChatMessage class.
     *
     * @param content - The content of the chat message.
     * @param author - The author of the chat message.
     */
    constructor(content: string, author: string) {
        super();
        this.content = content;
        this.author = author;
    }
}