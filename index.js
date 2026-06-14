const express = require("express");
const path = require("path");

const web = express();

web.use(express.static(path.join(__dirname, "public")));

web.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

web.listen(3000, () => {
  console.log("Dashboard running on http://localhost:3000");
});

require("dotenv").config();

const { App } = require("@slack/bolt");
const axios = require("axios");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

//ssb-help
app.command("/ssb-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text: "Here are the commands you can use:\n" +
          "• `/ssb-ping` - Check the bot's latency\n" +
          "• `/ssb-catfact` - Get a random cat fact\n" +
          "• `/ssb-joke` - Get a random joke\n" +
          "• `/ssb-gif` - Get a random neko gif\n" +
          "• `/ssb-trivia` - Get a medium difficulty trivia question\n" +
          "• `/ssb-weather <city>` - Check live weather updates for a city\n" +
          "• `/ssb-userinfo <@user>` - Look up public Slack profile details\n" +
          "• `/ssb-ipinfo <ip>` - Fetch physical geolocation data for an IP address\n" +
          "• `/ssb-website <domain>` - Check active target DNS paths for a domain\n" +
          "• `/ssb-web <query>` - Run a live Google Search query using SerpApi"
  });
});

// Command: /ssb-ping
app.command("/ssb-ping", async ({ ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

// Command: /ssb-catfact
app.command("/ssb-catfact", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `Cat Fact:\n${response.data.fact}` });
  } catch (err) {
    await respond({ text: "Failed to fetch a cat fact." });
  }
});

// Command: /ssb-joke
app.command("/ssb-joke", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke", { timeout: 3000 });
    await respond({
      text: `${response.data.setup}\n\n${response.data.punchline}`
    });
  } catch (err) {
    await respond({ text: "Failed to fetch a joke." });
  }
});

// Command: /ssb-gif
app.command("/ssb-gif", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get('https://nekos.best/api/v2/neko', { timeout: 3000 });
    await respond({ text: `Neko Image:\n${response.data.results[0].url}` });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a gif." });
  }
});

// Command: /ssb-trivia
app.command("/ssb-trivia", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get("https://opentdb.com/api.php?amount=1&difficulty=medium&type=multiple&encode=url3986", { timeout: 3000 });
    const question = response.data.results[0];

    await respond({
      text: `🧠 Your trivia Question\n\n${decodeURIComponent(question.question)}\n\nA) ${decodeURIComponent(question.correct_answer)}\nB) ${decodeURIComponent(question.incorrect_answers[0])}\nC) ${decodeURIComponent(question.incorrect_answers[1])}\nD) ${decodeURIComponent(question.incorrect_answers[2])}`
    });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a trivia question." });
  }
});

// Command: /ssb-weather
app.command("/ssb-weather", async ({ command, ack, respond }) => {
  await ack();
  const city = command.text;
  if (!city) {
    await respond({ text: "Please provide a city! Usage: `/ssb-weather <city>`" });
    return;
  }
  try {
    const response = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=3`, { timeout: 3000 });
    await respond({ text: response.data });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch weather information." });
  }
}); 

// Command: /ssb-ipinfo
app.command("/ssb-ipinfo", async ({ command, ack, respond }) => {
  await ack();

  const rawText = command.text.trim();
  
  if (!rawText) {
    await respond({ text: "Please provide an IP address! Usage: `/ssb-ipinfo 8.8.8.8`" });
    return;
  }

  const ipv4Match = rawText.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  const ipv6Match = rawText.match(/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/); 
  
  const ipAddress = ipv4Match ? ipv4Match[0] : (ipv6Match ? ipv6Match[0] : null);

  if (!ipAddress) {
    await respond({ text: "Could not parse a valid IP address. Please make sure you enter a standard format like `8.8.8.8`." });
    return;
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, { timeout: 3000 });
    const data = response.data;

    if (data.status === "fail") {
      await respond({ text: `❌ Failed to lookup IP: ${data.message || "Invalid IP address or private range."}` });
      return;
    }

    await respond({
      text: `🌐 *IP Lookup Info for ${data.query}*:\n` +
            `• *Country:* ${data.country} (${data.countryCode})\n` +
            `• *Region/State:* ${data.regionName}\n` +
            `• *City:* ${data.city}\n` +
            `• *Zip/Postal Code:* ${data.zip || "N/A"}\n` +
            `• *ISP:* ${data.isp}\n` +
            `• *Organization:* ${data.org || "N/A"}\n` +
            `• *Coordinates:* ${data.lat}, ${data.lon}`
    });

  } catch (err) {
    console.error(err);
    await respond({ text: "Error connecting to the IP lookup service." });
  }
});

// Command: /ssb-website
app.command("/ssb-website", async ({ command, ack, respond }) => {
  await ack();

  const rawText = command.text.trim();
  if (!rawText) {
    await respond({ text: "Please provide a domain! Usage: `/ssb-website google.com`" });
    return;
  }

  let domain = rawText.replace(/[<>]/g, '').split('|')[0];

  domain = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  domain = domain.split('/')[0];

  try {
    const response = await axios.get(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { 'accept': 'application/dns-json' },
      timeout: 3000
    });

    const data = response.data;

    if (data.Status !== 0 || !data.Answer) {
      await respond({ text: `❌ Could not find valid DNS records for \`${domain}\`. Make sure it's a valid registered domain.` });
      return;
    }
    
    const ipAddresses = data.Answer.filter(record => record.type === 1).map(record => record.data).join(", ");

    await respond({
      text: `🖥️ *Website Info for ${domain}*:\n` +
            `• *Status:* Active / Resolving\n` +
            `• *Primary IP Target(s):* ${ipAddresses || "Hidden behind CDN/Cloudflare"}\n` +
            `• *Query Security Details:* DNSSEC ${data.AD ? "Verified" : "Unverified"}\n\n` +
            `_Tip: You can now take that IP and test it with \`/ssb-ipinfo <ip>\` to see where the servers are hosted!_`
    });

  } catch (err) {
    console.error(err);
    await respond({ text: "Error connecting to the domain analysis service." });
  }
});

// Command: /ssb-web
app.command("/ssb-web", async ({ command, ack, respond }) => {
  await ack();

  const query = command.text.trim();
  if (!query) {
    await respond({ text: "Please provide a search term! Usage: `/ssb-web Nodejs tutorial`" });
    return;
  }

  await respond({ text: `🔍 _Searching Google for: "${query}"..._` });

  try {
    const serpapi = require("serpapi");
    
    const results = await serpapi.getJson({
      engine: "google",
      q: query,
      api_key: process.env.SERPAPI_API_KEY,
      num: 3
    });

    const organicResults = results.organic_results;

    if (!organicResults || organicResults.length === 0) {
      await respond({ text: "No web results found for that query." });
      return;
    }

    let responseText = `🌐 *Top Search Results for:* "${query}"\n\n`;
    
    organicResults.forEach((result, index) => {
      responseText += `${index + 1}. *<${result.link}|${result.title}>*\n_${result.snippet}_\n\n`;
    });

    await respond({ text: responseText });

  } catch (err) {
    console.error(err);
    await respond({ text: "❌ Failed to complete web search. Double check your SERPAPI_API_KEY value." });
  }
});

(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log("⚡️ Bot is running!");
  } catch (error) {
    console.error("Failed to start app", error);
  }
})();