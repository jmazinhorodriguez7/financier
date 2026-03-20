const jsdom = require("jsdom");
const { JSDOM } = jsdom;

JSDOM.fromURL("http://localhost:51470", {
    runScripts: "dangerously",
    resources: "usable"
}).then(dom => {
    const window = dom.window;

    // We replace DOMContentLoaded to prevent app.js from starting automatically
    const origAddEventListener = window.document.addEventListener;
    window.document.addEventListener = function(type, listener, options) {
        if (type === 'DOMContentLoaded') {
            window.__appInit = listener;
            return;
        }
        return origAddEventListener.call(this, type, listener, options);
    };

    window.console.log = function(...args) {
        console.log("LOG:", ...args);
    };
    window.console.error = function(...args) {
        console.error("ERROR:", ...args);
    };

    setTimeout(() => {
        console.log("Supabase Keys:", Object.keys(window.supabase));
        const db = window.FinancierDB;
        console.log("FinancierDB Keys:", Object.keys(db));
        if (db.auth) {
            console.log("Auth Keys:", Object.keys(db.auth));
        } else {
            console.log("No Auth object.");
        }
        process.exit(0);
    }, 2000);
}).catch(console.error);
