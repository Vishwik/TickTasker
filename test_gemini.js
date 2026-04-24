import { GoogleGenerativeAI } from '@google/generative-ai';

const ai = new GoogleGenerativeAI('AIzaSyDOjjvRK8ALjxQdZYV5Vb9AvAIfk55TfqY');

async function test() {
    try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Say hello world');
        console.log("SUCCESS:", result.response.text());
    } catch (e) {
        console.error("ERROR:", e);
    }
}

test();
