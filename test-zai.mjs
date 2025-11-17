import ZAI from "z-ai-web-dev-sdk";

const run = async () => {
  try {
    const zai = await ZAI.create();
    console.log("ZAI initialized:", zai);
  } catch (err) {
    console.error("Error initializing ZAI:", err);
  }
};

run();
