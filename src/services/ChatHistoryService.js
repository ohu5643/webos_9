import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/firebase.js";

export default class ChatHistoryService {
    constructor() {
        this.sessionId =
            `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    getMessagesRef(uid) {
        return collection(
            db,
            "users",
            uid,
            "aiAssistantMessages"
        );
    }

    async saveMessage(uid, role, content) {
        await addDoc(
            this.getMessagesRef(uid),
            {
                role,
                content,
                sessionId: this.sessionId,
                createdAt: serverTimestamp(),
                clientCreatedAt: Date.now()
            }
        );
    }

    async loadRecentMessages(uid, count = 20) {
        const q =
            query(
                this.getMessagesRef(uid),
                orderBy("clientCreatedAt", "desc"),
                limit(count)
            );

        const snapshot =
            await getDocs(q);

        return snapshot.docs
            .map(doc => doc.data())
            .reverse()
            .map(message => ({
                role: message.role,
                content: message.content
            }));
    }
}
