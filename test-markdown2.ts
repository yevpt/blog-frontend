import { markdownToHtml } from "./apps/web/lib/markdown";

async function test() {
  try {
    const html = await markdownToHtml("[在线聊天室](https://www.cystart.cc)");
    console.log("HTML Output:", JSON.stringify(html));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
