const axios = require("axios");
const cheerio = require("cheerio");

async function checkForChanges() {
    try {
        const { data: scriptDataAsString } = await axios.get(
            "https://api.thefuture.university/key-value/whatsapp_groups_automation_keys",
        );
        const scriptData = JSON.parse(scriptDataAsString.data.value);
        const { URLS_TO_MONITOR, STATIC_FORM_API_KEYS } = scriptData;
        const { data } = await axios.get(
            "https://api.thefuture.university/key-value/whatsapp_groups_automation",
        );
        const previousValuesAsString = await data.data.value;
        let previousValues = JSON.parse(previousValuesAsString);
        let newData = [];

        for (let url of URLS_TO_MONITOR) {
            try {
                const response = await axios.get(url);
                const $ = cheerio.load(response.data);

                // Find the WhatsApp group link dynamically
                $("a").each((index, element) => {
                    const href = $(element).attr("href");
                    if (href && href.includes("chat.whatsapp.com")) {
                        if (
                            !previousValues.find(
                                (a) => a.whatsappGroup === href,
                            )
                        ) {
                            previousValues = previousValues.filter(
                                (pV) => pV.url !== url,
                            );
                            previousValues.push({
                                whatsappGroup: href,
                                url: url,
                            });
                            newData.push({ url, whatsappGroup: href });
                        }
                    }
                });
            } catch (error) {
                console.error(`Error fetching ${url}:`, error);
            }
        }

        if (newData.length > 0) {
            // store the prev data (updated) in db
            await axios.put("https://api.thefuture.university/key-value", {
                key: "whatsapp_groups_automation",
                value: JSON.stringify(previousValues),
            });

            await axios.post("https://api.staticforms.xyz/submit", {
                accessKey: "539fa6ae-403c-46ec-9d10-14f78b09a489",
                subject: "⚠️ALERT! WHATSAPP GROUP LINKS HAVE CHANGED",
                ...newData.reduce((acc, d) => {
                    acc[`$${d.url}`] = d.whatsappGroup;
                    return acc;
                }, {}),
            });
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkForChanges();
