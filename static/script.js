/**
 * Application Layer Protocol Visualizer - Master Client Controller
 * Architecture: State-machine driven protocol simulation with SVG packet animation,
 * synchronized video streaming buffer, and timestamped activity logs.
 */

(function () {
    "use strict";

    // ==========================================================================
    // 1. STATE OBJECT
    // ==========================================================================
    const state = {
        currentActivity: null, // 'browsing' | 'mail' | 'streaming' | null
        protocolMessages: [],
        currentStep: -1,
        isPaused: false,
        timer: null,
        stepInterval: 1800,
        streamingState: {
            quality: "1080p",
            bufferPercent: 0,
            playing: false,
            segments: ["pending", "pending", "pending", "pending"] // 'pending' | 'downloading' | 'completed'
        },
        nodeCoords: {
            client: { x: 140, y: 125, elId: "nodeClient" },
            dns: { x: 540, y: 55, elId: "nodeDns", linkId: "linkDns" },
            web: { x: 540, y: 125, elId: "nodeWeb", linkId: "linkWeb" },
            mail: { x: 540, y: 195, elId: "nodeMail", linkId: "linkMail" }
        }
    };

    // ==========================================================================
    // 2. DOM ELEMENT REFERENCES
    // ==========================================================================
    const elements = {
        // Top status
        systemStatusTag: document.getElementById("systemStatusTag"),
        systemStatusText: document.getElementById("systemStatusText"),
        statusDot: document.getElementById("statusDot"),

        // Cards
        browsingCard: document.getElementById("browsingCard"),
        mailCard: document.getElementById("mailCard"),
        streamingCard: document.getElementById("streamingCard"),

        // Inputs & Buttons - Browsing
        urlInput: document.getElementById("url"),
        visitBtn: document.getElementById("visitBtn"),
        browsingFeedback: document.getElementById("browsingFeedback"),
        browsingStatusBadge: document.getElementById("browsingStatusBadge"),

        // Inputs & Buttons - Mail
        mailTo: document.getElementById("mailTo"),
        mailSubject: document.getElementById("mailSubject"),
        mailBody: document.getElementById("mailBody"),
        sendMailBtn: document.getElementById("sendMailBtn"),
        mailFeedback: document.getElementById("mailFeedback"),
        mailStatusBadge: document.getElementById("mailStatusBadge"),

        // Inputs & Buttons - Streaming
        qualitySelect: document.getElementById("quality"),
        playBtn: document.getElementById("playBtn"),
        pauseBtn: document.getElementById("pauseBtn"),
        streamingFeedback: document.getElementById("streamingFeedback"),
        streamingStatusBadge: document.getElementById("streamingStatusBadge"),

        // Video Player Simulator
        playerQualityTag: document.getElementById("playerQualityTag"),
        playerPlaybackState: document.getElementById("playerPlaybackState"),
        playerTimeDisplay: document.getElementById("playerTimeDisplay"),
        bufferPercentText: document.getElementById("bufferPercentText"),
        bufferFillBar: document.getElementById("bufferFillBar"),
        segPills: [
            document.getElementById("seg1"),
            document.getElementById("seg2"),
            document.getElementById("seg3"),
            document.getElementById("seg4")
        ],

        // Activity Log
        activityLog: document.getElementById("activityLog"),
        emptyLogPrompt: document.getElementById("emptyLogPrompt"),
        clearLogBtn: document.getElementById("clearLogBtn"),

        // Protocol Panel Headers & Badges
        activeProtocolBadge: document.getElementById("activeProtocolBadge"),
        stepCounterBadge: document.getElementById("stepCounterBadge"),

        // Topology SVG
        networkSvg: document.getElementById("networkSvg"),
        packetGroup: document.getElementById("packetGroup"),
        packetDot: document.getElementById("packetDot"),
        packetText: document.getElementById("packetText"),
        linkDns: document.getElementById("linkDns"),
        linkWeb: document.getElementById("linkWeb"),
        linkMail: document.getElementById("linkMail"),

        // Timeline
        timelineTrack: document.getElementById("timelineTrack"),

        // Message Display
        waitingScreen: document.getElementById("waitingScreen"),
        activeMessageCard: document.getElementById("activeMessageCard"),
        msgProtocolTag: document.getElementById("msgProtocolTag"),
        msgDirectionTag: document.getElementById("msgDirectionTag"),
        msgStepIndicator: document.getElementById("msgStepIndicator"),
        msgTitle: document.getElementById("msgTitle"),
        msgPayload: document.getElementById("msgPayload"),
        msgExplanation: document.getElementById("msgExplanation"),
        copyPayloadBtn: document.getElementById("copyPayloadBtn"),

        // Controls
        previousBtn: document.getElementById("previousBtn"),
        pauseVisualizationBtn: document.getElementById("pauseVisualizationBtn"),
        pauseBtnIcon: document.getElementById("pauseBtnIcon"),
        pauseBtnText: document.getElementById("pauseBtnText"),
        nextBtn: document.getElementById("nextBtn"),
        replayBtn: document.getElementById("replayBtn"),
        speedSelect: document.getElementById("speedSelect")
    };

    // ==========================================================================
    // 3. UTILITY & HELPER FUNCTIONS
    // ==========================================================================
    function getLocalTimestamp() {
        const now = new Date();
        return now.toTimeString().split(" ")[0]; // HH:MM:SS
    }

    function addActivityLog(message, protocol = "SYSTEM") {
        if (!elements.activityLog) return;

        if (elements.emptyLogPrompt) {
            elements.emptyLogPrompt.style.display = "none";
        }

        const entry = document.createElement("div");
        entry.className = "log-entry";

        const pLower = protocol.toLowerCase();
        const tagClass = ["dns", "http", "smtp"].includes(pLower) ? pLower : "system";

        entry.innerHTML = `
            <span class="log-time">${getLocalTimestamp()}</span>
            <span class="log-tag ${tagClass}">[${protocol.toUpperCase()}]</span>
            <span class="log-msg">${escapeHtml(message)}</span>
        `;

        elements.activityLog.appendChild(entry);
        elements.activityLog.scrollTop = elements.activityLog.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function clearAllTimers() {
        if (state.timer !== null) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    }

    function setSystemStatus(text, isLive = true) {
        if (elements.systemStatusText) elements.systemStatusText.textContent = text;
        if (elements.statusDot) {
            elements.statusDot.className = `pulse-dot ${isLive ? "live" : "sim"}`;
        }
    }

    function showFeedback(element, text, isError = true) {
        if (!element) return;
        element.textContent = text;
        element.className = `activity-feedback ${isError ? "error" : "info"}`;
        element.style.display = "block";
    }

    function clearFeedback(element) {
        if (!element) return;
        element.textContent = "";
        element.style.display = "none";
    }

    function updateControlButtons() {
        const total = state.protocolMessages.length;
        const current = state.currentStep;

        if (total === 0 || current === -1) {
            elements.previousBtn.disabled = true;
            elements.nextBtn.disabled = true;
            elements.pauseVisualizationBtn.disabled = true;
            elements.replayBtn.disabled = true;
            return;
        }

        elements.previousBtn.disabled = current <= 0;
        elements.nextBtn.disabled = current >= total - 1;
        elements.pauseVisualizationBtn.disabled = false;
        elements.replayBtn.disabled = false;

        if (state.isPaused) {
            elements.pauseBtnIcon.textContent = "▶";
            elements.pauseBtnText.textContent = "Resume";
            if (elements.pauseBtn) {
                elements.pauseBtn.querySelector(".btn-icon").textContent = "▶";
                elements.pauseBtn.childNodes[elements.pauseBtn.childNodes.length - 1].nodeValue = " Resume";
            }
        } else {
            elements.pauseBtnIcon.textContent = "⏸";
            elements.pauseBtnText.textContent = "Pause";
            if (elements.pauseBtn) {
                elements.pauseBtn.querySelector(".btn-icon").textContent = "⏸";
                elements.pauseBtn.childNodes[elements.pauseBtn.childNodes.length - 1].nodeValue = " Pause";
            }
        }
    }

    // ==========================================================================
    // 4. TIMELINE RENDERING
    // ==========================================================================
    function renderTimeline() {
        if (!elements.timelineTrack) return;
        elements.timelineTrack.innerHTML = "";

        if (state.protocolMessages.length === 0) {
            elements.timelineTrack.innerHTML = '<div class="timeline-empty">Start an activity to populate the timeline.</div>';
            return;
        }

        state.protocolMessages.forEach((msg, idx) => {
            const stepDiv = document.createElement("div");
            stepDiv.className = `timeline-step ${idx === state.currentStep ? "active" : ""} ${idx < state.currentStep ? "completed" : ""}`;
            stepDiv.title = `Jump to Step ${idx + 1}: ${msg.title}`;

            stepDiv.innerHTML = `
                <div class="step-marker">${idx + 1}</div>
                <div class="step-title-short">${escapeHtml(msg.shortLabel || msg.protocol)}</div>
            `;

            stepDiv.addEventListener("click", () => {
                jumpToStep(idx);
            });

            elements.timelineTrack.appendChild(stepDiv);
        });
    }

    function updateTimelineHighlight() {
        const stepItems = elements.timelineTrack.querySelectorAll(".timeline-step");
        stepItems.forEach((stepEl, idx) => {
            stepEl.classList.remove("active", "completed");
            if (idx === state.currentStep) {
                stepEl.classList.add("active");
                stepEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            } else if (idx < state.currentStep) {
                stepEl.classList.add("completed");
            }
        });
    }

    // ==========================================================================
    // 5. SVG NETWORK TOPOLOGY & PACKET ANIMATION
    // ==========================================================================
    function resetTopologyVisuals() {
        // Clear active classes from all nodes
        const nodes = elements.networkSvg.querySelectorAll(".network-node");
        nodes.forEach((node) => node.classList.remove("node-active"));

        // Clear active link highlights
        [elements.linkDns, elements.linkWeb, elements.linkMail].forEach((link) => {
            if (link) link.classList.remove("active-channel");
        });

        // Hide packet
        if (elements.packetGroup) {
            elements.packetGroup.style.display = "none";
        }
    }

    function animatePacket(sourceNodeKey, targetNodeKey, protocol) {
        if (!elements.packetGroup) return;

        const src = state.nodeCoords[sourceNodeKey];
        const tgt = state.nodeCoords[targetNodeKey];
        if (!src || !tgt) return;

        // Highlight active nodes
        const srcEl = document.getElementById(src.elId);
        const tgtEl = document.getElementById(tgt.elId);
        if (srcEl) srcEl.classList.add("node-active");
        if (tgtEl) tgtEl.classList.add("node-active");

        // Highlight the relevant transmission channel link
        const linkKey = sourceNodeKey === "client" ? tgt.linkId : src.linkId;
        const linkEl = document.getElementById(linkKey);
        if (linkEl) linkEl.classList.add("active-channel");

        // Configure packet appearance
        elements.packetGroup.style.display = "block";
        elements.packetText.textContent = protocol.toUpperCase();

        const colorMap = {
            DNS: "#38bdf8",
            HTTP: "#10b981",
            SMTP: "#f59e0b"
        };
        const packetColor = colorMap[protocol.toUpperCase()] || "#38bdf8";
        elements.packetDot.style.fill = packetColor;
        elements.packetText.style.fill = packetColor;

        // Calculate start and end coordinates
        const startX = src.x;
        const startY = src.y;
        const endX = tgt.x;
        const endY = tgt.y;

        // Set initial position without transition
        elements.packetGroup.style.transition = "none";
        elements.packetGroup.setAttribute("transform", `translate(${startX}, ${startY})`);

        // Force reflow
        void elements.packetGroup.getBoundingClientRect();

        // Check reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) {
            elements.packetGroup.setAttribute("transform", `translate(${endX}, ${endY})`);
            return;
        }

        // Animate to end position
        const animDuration = Math.min(800, state.stepInterval * 0.45);
        elements.packetGroup.style.transition = `transform ${animDuration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
        elements.packetGroup.setAttribute("transform", `translate(${endX}, ${endY})`);
    }

    // ==========================================================================
    // 6. PROTOCOL SEQUENCE GENERATORS
    // ==========================================================================

    /**
     * BROWSING: DNS Query -> DNS Response -> HTTP Request -> HTTP Response
     */
    function buildBrowsingSequence(domain) {
        const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim() || "example.com";
        const simulatedIp = "93.184.216.34";
        const queryId = "0x" + Math.floor(Math.random() * 65535).toString(16).padStart(4, "0").toUpperCase();
        const dateStr = new Date().toUTCString();

        return [
            {
                protocol: "DNS",
                shortLabel: "DNS Query",
                directionText: "Client ➔ DNS Server",
                sourceNode: "client",
                targetNode: "dns",
                title: `Simulated DNS Query: Standard Resolution for ${cleanDomain}`,
                message: [
                    `;; RFC 1035 SIMULATED DNS QUERY`,
                    `;; HEADER SECTION`,
                    `;; Transaction ID: ${queryId} | Flags: 0x0100 (Standard Query, Recursion Desired)`,
                    `;; Questions: 1 | Answer RRs: 0 | Authority RRs: 0 | Additional RRs: 0`,
                    ``,
                    `;; QUESTION SECTION:`,
                    `;${cleanDomain}.                     IN      A`,
                    ``,
                    `;; CLIENT METADATA:`,
                    `;; Transport: UDP | Source Port: 53184 -> Destination Port: 53`,
                    `;; Resolver: 8.8.8.8 (Google Public DNS)`
                ].join("\n"),
                explanation: `Before the client web browser can send an HTTP request to "${cleanDomain}", it must resolve the human-readable domain name into an IP address. The client generates an RFC 1035 DNS query packet with Query Type "A" (IPv4 Address), Class "IN" (Internet), and sends it to the DNS resolver over UDP port 53.`
            },
            {
                protocol: "DNS",
                shortLabel: "DNS Response",
                directionText: "DNS Server ➔ Client",
                sourceNode: "dns",
                targetNode: "client",
                title: `Simulated DNS Response: ${cleanDomain} resolved to ${simulatedIp}`,
                message: [
                    `;; RFC 1035 SIMULATED DNS RESPONSE`,
                    `;; HEADER SECTION`,
                    `;; Transaction ID: ${queryId} | Flags: 0x8180 (Standard Query Response, No Error)`,
                    `;; Questions: 1 | Answer RRs: 1 | Authority RRs: 0 | Additional RRs: 0`,
                    ``,
                    `;; ANSWER SECTION:`,
                    `${cleanDomain}.              300     IN      A       ${simulatedIp}`,
                    ``,
                    `;; STATUS: NOERROR`,
                    `;; Query time: 14 msec | Time-To-Live (TTL): 300 seconds`,
                    `;; Recursion Available: Yes | Authoritative: No (Cached)`
                ].join("\n"),
                explanation: `The DNS Server matches Transaction ID ${queryId} and returns an "A" record mapping "${cleanDomain}" to the IP address ${simulatedIp}. The client receives the response and caches the IP address in its local operating system resolver cache for 300 seconds (TTL).`
            },
            {
                protocol: "HTTP",
                shortLabel: "HTTP GET",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET Request: Retrieve /`,
                message: [
                    `GET / HTTP/1.1`,
                    `Host: ${cleanDomain}`,
                    `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ApplicationLayerVisualizer/1.0`,
                    `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
                    `Accept-Language: en-US,en;q=0.9`,
                    `Accept-Encoding: gzip, deflate`,
                    `Connection: keep-alive`,
                    `Upgrade-Insecure-Requests: 1`,
                    ``,
                    `[Payload: 0 bytes (GET headers only)]`
                ].join("\n"),
                explanation: `Now that the client has the web server's IP (${simulatedIp}), the transport layer completes the TCP 3-way handshake on Port 80. The Application Layer then transmits an RFC 7230 HTTP/1.1 GET request requesting the root document path "/". The "Host" header is mandatory in HTTP/1.1 to support virtual hosting.`
            },
            {
                protocol: "HTTP",
                shortLabel: "HTTP 200 OK",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK Response: Deliver HTML Document`,
                message: [
                    `HTTP/1.1 200 OK`,
                    `Date: ${dateStr}`,
                    `Server: Apache/2.4.52 (Ubuntu)`,
                    `Last-Modified: Sun, 15 Sep 2026 12:00:00 GMT`,
                    `ETag: "6d2-6062f6b8b8"`,
                    `Accept-Ranges: bytes`,
                    `Content-Length: 1256`,
                    `Content-Type: text/html; charset=UTF-8`,
                    `Connection: keep-alive`,
                    ``,
                    `<!DOCTYPE html>`,
                    `<html lang="en">`,
                    `<head>`,
                    `    <title>${cleanDomain} - Home</title>`,
                    `</head>`,
                    `<body>`,
                    `    <h1>Welcome to ${cleanDomain}!</h1>`,
                    `    <p>This web page was successfully delivered over HTTP/1.1.</p>`,
                    `</body>`,
                    `</html>`
                ].join("\n"),
                explanation: `The Web Server processes the GET request, locates the requested HTML file, and sends back an HTTP status code 200 OK. The response headers define metadata (Content-Type, Content-Length, Server software) followed by the HTML payload. The browser renders the HTML on screen.`
            }
        ];
    }

    /**
     * MAIL: DNS MX Query -> DNS MX Response -> Full SMTP RFC 5321 Handshake & Data
     */
    function buildMailSequence(toAddr, subject, body) {
        const domain = toAddr.includes("@") ? toAddr.split("@")[1] : "example.com";
        const mailServerHost = `mail.${domain}`;
        const mailServerIp = "198.51.100.25";
        const queryId = "0x" + Math.floor(Math.random() * 65535).toString(16).padStart(4, "0").toUpperCase();
        const dateStr = new Date().toUTCString();
        const senderAddr = "sender@visualizer.local";

        return [
            {
                protocol: "DNS",
                shortLabel: "DNS MX Query",
                directionText: "Client ➔ DNS Server",
                sourceNode: "client",
                targetNode: "dns",
                title: `Simulated DNS MX Query: Find Mail Exchange for ${domain}`,
                message: [
                    `;; RFC 1035 SIMULATED DNS MX QUERY`,
                    `;; Transaction ID: ${queryId} | Flags: 0x0100 (Standard Query)`,
                    `;; Questions: 1 | Answer RRs: 0 | Authority RRs: 0 | Additional RRs: 0`,
                    ``,
                    `;; QUESTION SECTION:`,
                    `;${domain}.                      IN      MX`,
                    ``,
                    `;; Client needs the designated Mail Transfer Agent (MTA) for destination domain.`
                ].join("\n"),
                explanation: `Before an email client (MUA) or sending MTA can deliver mail to ${toAddr}, it must discover which server handles mail for the domain "${domain}". It performs an RFC 1035 DNS Query for the MX (Mail Exchange) record.`
            },
            {
                protocol: "DNS",
                shortLabel: "DNS MX Answer",
                directionText: "DNS Server ➔ Client",
                sourceNode: "dns",
                targetNode: "client",
                title: `Simulated DNS MX Response: ${domain} handled by ${mailServerHost}`,
                message: [
                    `;; RFC 1035 SIMULATED DNS MX RESPONSE`,
                    `;; Transaction ID: ${queryId} | Flags: 0x8180 (No Error)`,
                    `;; Questions: 1 | Answer RRs: 1 | Additional RRs: 1`,
                    ``,
                    `;; ANSWER SECTION:`,
                    `${domain}.               300     IN      MX      10 ${mailServerHost}.`,
                    ``,
                    `;; ADDITIONAL SECTION (Glue Record):`,
                    `${mailServerHost}.          300     IN      A       ${mailServerIp}`
                ].join("\n"),
                explanation: `The DNS server returns the MX record with priority preference 10 pointing to "${mailServerHost}". It also includes an "A" record glue entry mapping ${mailServerHost} to IP ${mailServerIp}, allowing the client to initiate an SMTP TCP connection directly on Port 25.`
            },
            {
                protocol: "SMTP",
                shortLabel: "220 Greeting",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP Service Ready (Code 220)`,
                message: [
                    `220 ${mailServerHost} ESMTP Postfix (Ubuntu)`
                ].join("\n"),
                explanation: `After establishing a TCP connection on port 25, the receiving Mail Transfer Agent (SMTP server) initiates the dialogue by issuing an RFC 5321 service greeting with reply code 220.`
            },
            {
                protocol: "SMTP",
                shortLabel: "EHLO",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP EHLO (Extended Hello)`,
                message: [
                    `EHLO client.visualizer.local`
                ].join("\n"),
                explanation: `The client identifies its domain to the server using the Extended Hello (EHLO) command. If the server only supported basic SMTP, HELO would be used; EHLO announces that the client supports ESMTP features.`
            },
            {
                protocol: "SMTP",
                shortLabel: "250 Features",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 250 Features Response`,
                message: [
                    `250-${mailServerHost} Hello client.visualizer.local [192.168.1.105]`,
                    `250-PIPELINING`,
                    `250-SIZE 10485760`,
                    `250-VRFY`,
                    `250-ETRN`,
                    `250-8BITMIME`,
                    `250 SMTPUTF8`
                ].join("\n"),
                explanation: `The mail server acknowledges the client identification with reply code 250 and advertises its supported ESMTP extensions, including max message size (10 MB), PIPELINING, and 8-bit MIME transport.`
            },
            {
                protocol: "SMTP",
                shortLabel: "MAIL FROM",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP MAIL FROM: Initialize Envelope Sender`,
                message: [
                    `MAIL FROM:<${senderAddr}>`
                ].join("\n"),
                explanation: `The client begins the mail transaction by specifying the envelope sender address. This is the reverse-path address where bounce messages (NDRs) will be delivered if transmission fails.`
            },
            {
                protocol: "SMTP",
                shortLabel: "250 Sender OK",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 250 Sender Address Accepted`,
                message: [
                    `250 2.1.0 Ok: Sender <${senderAddr}> accepted`
                ].join("\n"),
                explanation: `The mail server validates that sender syntax is well-formed and verifies it is willing to accept mail from this domain, returning code 250.`
            },
            {
                protocol: "SMTP",
                shortLabel: "RCPT TO",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP RCPT TO: Specify Envelope Recipient`,
                message: [
                    `RCPT TO:<${toAddr}>`
                ].join("\n"),
                explanation: `The client specifies the intended recipient for the mail. The RCPT TO command can be repeated for multiple recipients before sending the body.`
            },
            {
                protocol: "SMTP",
                shortLabel: "250 Recipient OK",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 250 Recipient Address Accepted`,
                message: [
                    `250 2.1.5 Ok: Recipient <${toAddr}> accepted`
                ].join("\n"),
                explanation: `The server confirms that the mailbox exists or that it is authorized to relay messages for "${domain}", returning code 250.`
            },
            {
                protocol: "SMTP",
                shortLabel: "DATA",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP DATA Command`,
                message: [
                    `DATA`
                ].join("\n"),
                explanation: `The client instructs the server that it is ready to transmit the message headers and message body payload.`
            },
            {
                protocol: "SMTP",
                shortLabel: "354 Start Input",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 354 Start Mail Input`,
                message: [
                    `354 End data with <CR><LF>.<CR><LF>`
                ].join("\n"),
                explanation: `The server grants permission to transmit the mail content, instructing the client to terminate the payload with a single period on its own line ("<CR><LF>.<CR><LF>").`
            },
            {
                protocol: "SMTP",
                shortLabel: "Mail Content",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP Message Body & Headers Transmission`,
                message: [
                    `From: Application Visualizer <${senderAddr}>`,
                    `To: <${toAddr}>`,
                    `Subject: ${subject}`,
                    `Date: ${dateStr}`,
                    `Message-ID: <${Date.now()}@visualizer.local>`,
                    `MIME-Version: 1.0`,
                    `Content-Type: text/plain; charset=UTF-8`,
                    ``,
                    body,
                    `.`
                ].join("\n"),
                explanation: `The client transmits the RFC 5322 message format: message headers (From, To, Subject, Date, Message-ID), a blank line separator, the body text, and finally the solitary dot (.) delimiter indicating the end of message input.`
            },
            {
                protocol: "SMTP",
                shortLabel: "250 Queued",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 250 Message Queued for Delivery`,
                message: [
                    `250 2.0.0 Ok: queued as 4Y9kLm2Z8xp771`
                ].join("\n"),
                explanation: `The server acknowledges successful receipt and storage of the complete email in its spool/queue with queue ID 4Y9kLm2Z8xp771. The message will now be delivered to the local mailbox or forwarded.`
            },
            {
                protocol: "SMTP",
                shortLabel: "QUIT",
                directionText: "Client ➔ Mail Server",
                sourceNode: "client",
                targetNode: "mail",
                title: `Simulated SMTP QUIT Command`,
                message: [
                    `QUIT`
                ].join("\n"),
                explanation: `The client finishes the mail session and asks the mail server to close the transmission channel.`
            },
            {
                protocol: "SMTP",
                shortLabel: "221 Bye",
                directionText: "Mail Server ➔ Client",
                sourceNode: "mail",
                targetNode: "client",
                title: `Simulated SMTP 221 Service Closing`,
                message: [
                    `221 2.0.0 ${mailServerHost} Service closing transmission channel`
                ].join("\n"),
                explanation: `The server confirms channel termination with reply code 221. The underlying TCP connection is gracefully closed via TCP FIN-ACK.`
            }
        ];
    }

    /**
     * STREAMING: DNS Query -> DNS Response -> HTTP GET Manifest -> HTTP 200 Manifest
     * -> 4 successive Segment HTTP Requests & Responses
     */
    function buildStreamingSequence(quality) {
        const cdnHost = "cdn.streamingservice.net";
        const cdnIp = "203.0.113.88";
        const queryId = "0x" + Math.floor(Math.random() * 65535).toString(16).padStart(4, "0").toUpperCase();
        const dateStr = new Date().toUTCString();

        const bitrateMap = {
            "360p": "800000",
            "480p": "1400000",
            "720p": "2800000",
            "1080p": "5000000"
        };
        const bitrate = bitrateMap[quality] || "5000000";

        return [
            // Step 1: DNS Query
            {
                protocol: "DNS",
                shortLabel: "DNS Query",
                directionText: "Client ➔ DNS Server",
                sourceNode: "client",
                targetNode: "dns",
                title: `Simulated DNS Query: CDN Edge Lookup for ${cdnHost}`,
                streamProgress: { buffer: 0, segmentIndex: -1, status: "pending" },
                message: [
                    `;; RFC 1035 SIMULATED DNS QUERY`,
                    `;; Transaction ID: ${queryId} | Flags: 0x0100`,
                    `;; Questions: 1 | Answer RRs: 0`,
                    ``,
                    `;; QUESTION SECTION:`,
                    `;${cdnHost}.                 IN      A`,
                    ``,
                    `;; Client prepares HTTP Adaptive Bitrate Streaming (HLS) session.`
                ].join("\n"),
                explanation: `Before initiating the video stream, the client must resolve the CDN edge server hostname (${cdnHost}) to an IP address using standard DNS name resolution.`
            },
            // Step 2: DNS Response
            {
                protocol: "DNS",
                shortLabel: "DNS Response",
                directionText: "DNS Server ➔ Client",
                sourceNode: "dns",
                targetNode: "client",
                title: `Simulated DNS Response: ${cdnHost} ➔ ${cdnIp}`,
                streamProgress: { buffer: 0, segmentIndex: -1, status: "pending" },
                message: [
                    `;; RFC 1035 SIMULATED DNS RESPONSE`,
                    `;; Transaction ID: ${queryId} | Flags: 0x8180 (No Error)`,
                    ``,
                    `;; ANSWER SECTION:`,
                    `${cdnHost}.          120     IN      A       ${cdnIp}`,
                    ``,
                    `;; TTL: 120s | Closest CDN Edge Node resolved.`
                ].join("\n"),
                explanation: `The DNS server returns the nearest CDN edge caching server IP (${cdnIp}). The client can now establish an HTTP connection with the CDN.`
            },
            // Step 3: GET Manifest
            {
                protocol: "HTTP",
                shortLabel: "GET Manifest",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET: Request Master Playlist (M3U8)`,
                streamProgress: { buffer: 0, segmentIndex: -1, status: "pending" },
                message: [
                    `GET /video/master.m3u8 HTTP/1.1`,
                    `Host: ${cdnHost}`,
                    `User-Agent: VideoPlayer/2.1 (HLS.js / ApplicationLayerVisualizer)`,
                    `Accept: application/vnd.apple.mpegurl, */*`,
                    `Connection: keep-alive`
                ].join("\n"),
                explanation: `In HTTP-based adaptive streaming (such as Apple HLS or MPEG-DASH), the video client first fetches a playlist/manifest file (.m3u8). This manifest describes the available audio/video codecs, bitrates, resolutions, and segment URLs.`
            },
            // Step 4: 200 OK Manifest
            {
                protocol: "HTTP",
                shortLabel: "200 Manifest",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK: HLS Master Playlist Delivered`,
                streamProgress: { buffer: 5, segmentIndex: -1, status: "pending" },
                message: [
                    `HTTP/1.1 200 OK`,
                    `Date: ${dateStr}`,
                    `Content-Type: application/vnd.apple.mpegurl`,
                    `Content-Length: 480`,
                    `Connection: keep-alive`,
                    ``,
                    `#EXTM3U`,
                    `#EXT-X-VERSION:3`,
                    `#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360`,
                    `360p/index.m3u8`,
                    `#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480`,
                    `480p/index.m3u8`,
                    `#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720`,
                    `720p/index.m3u8`,
                    `#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080`,
                    `1080p/index.m3u8`
                ].join("\n"),
                explanation: `The server returns the HLS master playlist. The player inspects the available stream representations and client network bandwidth, selecting the requested "${quality}" stream (${bitrate} bps).`
            },
            // Step 5: GET Segment 001
            {
                protocol: "HTTP",
                shortLabel: "GET Seg 001",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET: Video Segment 001 (${quality})`,
                streamProgress: { buffer: 10, segmentIndex: 0, status: "downloading" },
                message: [
                    `GET /video/${quality}/segment001.ts HTTP/1.1`,
                    `Host: ${cdnHost}`,
                    `Range: bytes=0-1250000`,
                    `Connection: keep-alive`
                ].join("\n"),
                explanation: `The client video engine requests the first 6-second MPEG-2 Transport Stream (.ts) video chunk for the selected "${quality}" stream.`
            },
            // Step 6: 200 OK Segment 001
            {
                protocol: "HTTP",
                shortLabel: "200 Seg 001",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK: Segment 001 Delivered (1.2 MB)`,
                streamProgress: { buffer: 25, segmentIndex: 0, status: "completed" },
                message: [
                    `HTTP/1.1 200 OK`,
                    `Content-Type: video/mp2t`,
                    `Content-Length: 1245184`,
                    `Connection: keep-alive`,
                    ``,
                    `[Binary Video Data: Segment 001 - MPEG-2 TS (H.264/AAC)]`
                ].join("\n"),
                explanation: `The web server delivers video segment 001. The client player pushes these bytes into its playback buffer (Buffer now ~25%), initializes playback decoding, and starts presenting video frames.`
            },
            // Step 7: GET Segment 002
            {
                protocol: "HTTP",
                shortLabel: "GET Seg 002",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET: Video Segment 002 (${quality})`,
                streamProgress: { buffer: 30, segmentIndex: 1, status: "downloading" },
                message: [
                    `GET /video/${quality}/segment002.ts HTTP/1.1`,
                    `Host: ${cdnHost}`,
                    `Range: bytes=0-1240000`,
                    `Connection: keep-alive`
                ].join("\n"),
                explanation: `While segment 001 is rendering, the player requests segment 002 ahead of time to prevent buffer underrun/stalling.`
            },
            // Step 8: 200 OK Segment 002
            {
                protocol: "HTTP",
                shortLabel: "200 Seg 002",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK: Segment 002 Delivered (1.2 MB)`,
                streamProgress: { buffer: 50, segmentIndex: 1, status: "completed" },
                message: [
                    `HTTP/1.1 200 OK`,
                    `Content-Type: video/mp2t`,
                    `Content-Length: 1238912`,
                    `Connection: keep-alive`,
                    ``,
                    `[Binary Video Data: Segment 002 - MPEG-2 TS (H.264/AAC)]`
                ].join("\n"),
                explanation: `Segment 002 arrives and is appended to the media source buffer (Buffer now ~50%). Continuous smooth playback is maintained without re-buffering.`
            },
            // Step 9: GET Segment 003
            {
                protocol: "HTTP",
                shortLabel: "GET Seg 003",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET: Video Segment 003 (${quality})`,
                streamProgress: { buffer: 55, segmentIndex: 2, status: "downloading" },
                message: [
                    `GET /video/${quality}/segment003.ts HTTP/1.1`,
                    `Host: ${cdnHost}`,
                    `Range: bytes=0-1210000`,
                    `Connection: keep-alive`
                ].join("\n"),
                explanation: `The client continues HTTP chunk pipelining, requesting the third media segment.`
            },
            // Step 10: 200 OK Segment 003
            {
                protocol: "HTTP",
                shortLabel: "200 Seg 003",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK: Segment 003 Delivered (1.2 MB)`,
                streamProgress: { buffer: 75, segmentIndex: 2, status: "completed" },
                message: [
                    `HTTP/1.1 200 OK`,
                    `Content-Type: video/mp2t`,
                    `Content-Length: 1210450`,
                    `Connection: keep-alive`,
                    ``,
                    `[Binary Video Data: Segment 003 - MPEG-2 TS (H.264/AAC)]`
                ].join("\n"),
                explanation: `Segment 003 is stored in the buffer (Buffer now ~75%). The client constantly measures the HTTP download throughput to decide if it should upgrade or downgrade quality in subsequent requests.`
            },
            // Step 11: GET Segment 004
            {
                protocol: "HTTP",
                shortLabel: "GET Seg 004",
                directionText: "Client ➔ Web Server",
                sourceNode: "client",
                targetNode: "web",
                title: `Simulated HTTP GET: Video Segment 004 (${quality})`,
                streamProgress: { buffer: 80, segmentIndex: 3, status: "downloading" },
                message: [
                    `GET /video/${quality}/segment004.ts HTTP/1.1`,
                    `Host: ${cdnHost}`,
                    `Range: bytes=0-1260000`,
                    `Connection: keep-alive`
                ].join("\n"),
                explanation: `Final demonstration segment requested over the persistent HTTP/1.1 connection.`
            },
            // Step 12: 200 OK Segment 004
            {
                protocol: "HTTP",
                shortLabel: "200 Seg 004",
                directionText: "Web Server ➔ Client",
                sourceNode: "web",
                targetNode: "client",
                title: `Simulated HTTP 200 OK: Segment 004 Delivered (Buffer Full)`,
                streamProgress: { buffer: 100, segmentIndex: 3, status: "completed" },
                message: [
                    `HTTP/1.1 200 OK`,
                    `Content-Type: video/mp2t`,
                    `Content-Length: 1258200`,
                    `Connection: keep-alive`,
                    ``,
                    `[Binary Video Data: Segment 004 - MPEG-2 TS (H.264/AAC)]`
                ].join("\n"),
                explanation: `The fourth chunk arrives, fully saturating the client's forward playback buffer (100%). This demonstrates why HTTP adaptive streaming dominates modern internet video: standard web servers and HTTP caching infrastructure can distribute video without specialized streaming servers.`
            }
        ];
    }

    // ==========================================================================
    // 7. STEP EXECUTION & RENDERING
    // ==========================================================================
    function renderCurrentStep() {
        if (state.currentStep < 0 || state.currentStep >= state.protocolMessages.length) {
            return;
        }

        const msg = state.protocolMessages[state.currentStep];
        const total = state.protocolMessages.length;
        const currentNum = state.currentStep + 1;

        // 1. Update Protocol Panel Badges & Titles
        elements.waitingScreen.style.display = "none";
        elements.activeMessageCard.style.display = "flex";

        elements.activeProtocolBadge.textContent = msg.protocol;
        elements.activeProtocolBadge.className = `active-protocol-badge badge-${msg.protocol.toLowerCase()}`;
        elements.stepCounterBadge.textContent = `STEP ${currentNum} / ${total}`;

        // 2. Update Message Card Fields
        elements.msgProtocolTag.textContent = msg.protocol;
        elements.msgProtocolTag.className = `protocol-tag ${msg.protocol.toLowerCase()}`;
        elements.msgDirectionTag.textContent = msg.directionText;
        elements.msgStepIndicator.textContent = `Step ${currentNum} of ${total}`;
        elements.msgTitle.textContent = msg.title;
        elements.msgPayload.textContent = msg.message;
        elements.msgExplanation.textContent = msg.explanation;

        // 3. Reset and Animate Topology SVG
        resetTopologyVisuals();
        animatePacket(msg.sourceNode, msg.targetNode, msg.protocol);

        // 4. Update Timeline Highlighting
        updateTimelineHighlight();

        // 5. Update Streaming Simulator UI (if current activity is streaming)
        if (state.currentActivity === "streaming" && msg.streamProgress) {
            updateStreamingUI(msg.streamProgress);
        }

        // 6. Log activity event
        addActivityLog(`${msg.shortLabel}: ${msg.title}`, msg.protocol);

        // 7. Update Control Buttons State
        updateControlButtons();
    }

    function updateStreamingUI(progress) {
        if (!progress) return;

        // Buffer bar
        if (typeof progress.buffer === "number") {
            elements.bufferFillBar.style.width = `${progress.buffer}%`;
            elements.bufferPercentText.textContent = `${progress.buffer}%`;
        }

        // Segments status
        if (progress.segmentIndex >= 0 && progress.segmentIndex < elements.segPills.length) {
            const pill = elements.segPills[progress.segmentIndex];
            const icon = pill.querySelector(".seg-icon");

            if (progress.status === "downloading") {
                pill.className = "segment-pill downloading";
                icon.textContent = "↓";
            } else if (progress.status === "completed") {
                pill.className = "segment-pill completed";
                icon.textContent = "✓";
            }
        }

        // Screen state
        if (progress.buffer > 0) {
            elements.playerPlaybackState.className = "player-center-status playing";
            elements.playerPlaybackState.querySelector(".state-icon").textContent = "▶";
            elements.playerPlaybackState.querySelector(".state-text").textContent = "PLAYING";
        }
    }

    function scheduleNextStep() {
        clearAllTimers();

        if (state.isPaused) return;

        if (state.currentStep >= state.protocolMessages.length - 1) {
            // Activity complete
            setSystemStatus("Simulation Complete", true);
            if (state.currentActivity === "streaming") {
                elements.pauseBtn.disabled = true;
                elements.playBtn.disabled = false;
            }
            return;
        }

        state.timer = setTimeout(() => {
            if (!state.isPaused && state.currentStep < state.protocolMessages.length - 1) {
                state.currentStep++;
                renderCurrentStep();
                scheduleNextStep();
            }
        }, state.stepInterval);
    }

    // ==========================================================================
    // 8. ACTIVITY CONTROLLERS
    // ==========================================================================
    function setActiveCard(activeCard) {
        [elements.browsingCard, elements.mailCard, elements.streamingCard].forEach((card) => {
            if (card) card.classList.remove("active-card");
        });
        if (activeCard) activeCard.classList.add("active-card");
    }

    function setActivityBadges(active) {
        elements.browsingStatusBadge.textContent = active === "browsing" ? "Active" : "Ready";
        elements.browsingStatusBadge.className = `activity-badge ${active === "browsing" ? "running" : ""}`;

        elements.mailStatusBadge.textContent = active === "mail" ? "Active" : "Ready";
        elements.mailStatusBadge.className = `activity-badge ${active === "mail" ? "running" : ""}`;

        elements.streamingStatusBadge.textContent = active === "streaming" ? "Active" : "Ready";
        elements.streamingStatusBadge.className = `activity-badge ${active === "streaming" ? "running" : ""}`;
    }

    // A. BROWSING
    function startBrowsing() {
        const urlValue = elements.urlInput.value.trim();
        clearFeedback(elements.browsingFeedback);

        if (!urlValue) {
            showFeedback(elements.browsingFeedback, "Please enter a valid website URL or domain name (e.g. example.com).");
            elements.urlInput.focus();
            return;
        }

        clearAllTimers();
        state.currentActivity = "browsing";
        setActiveCard(elements.browsingCard);
        setActivityBadges("browsing");
        setSystemStatus("Simulating: Browsing (DNS + HTTP)", true);

        state.protocolMessages = buildBrowsingSequence(urlValue);
        state.currentStep = 0;
        state.isPaused = false;

        addActivityLog(`Browsing activity initiated for ${urlValue}`, "SYSTEM");

        renderTimeline();
        renderCurrentStep();
        scheduleNextStep();
    }

    // B. MAIL
    function startMail() {
        const toVal = elements.mailTo.value.trim();
        const subjectVal = elements.mailSubject.value.trim();
        const bodyVal = elements.mailBody.value.trim();
        clearFeedback(elements.mailFeedback);

        if (!toVal) {
            showFeedback(elements.mailFeedback, "Recipient email address (To) is required.");
            elements.mailTo.focus();
            return;
        }
        if (!subjectVal) {
            showFeedback(elements.mailFeedback, "Subject line cannot be empty.");
            elements.mailSubject.focus();
            return;
        }
        if (!bodyVal) {
            showFeedback(elements.mailFeedback, "Message body cannot be empty.");
            elements.mailBody.focus();
            return;
        }

        clearAllTimers();
        state.currentActivity = "mail";
        setActiveCard(elements.mailCard);
        setActivityBadges("mail");
        setSystemStatus("Simulating: Email Client (DNS + SMTP)", true);

        state.protocolMessages = buildMailSequence(toVal, subjectVal, bodyVal);
        state.currentStep = 0;
        state.isPaused = false;

        addActivityLog(`Mail activity initiated to ${toVal}`, "SYSTEM");

        renderTimeline();
        renderCurrentStep();
        scheduleNextStep();
    }

    // C. STREAMING
    function resetStreamingWidget() {
        elements.bufferFillBar.style.width = "0%";
        elements.bufferPercentText.textContent = "0%";
        elements.playerPlaybackState.className = "player-center-status";
        elements.playerPlaybackState.querySelector(".state-icon").textContent = "⏹";
        elements.playerPlaybackState.querySelector(".state-text").textContent = "STANDBY";

        elements.segPills.forEach((pill) => {
            pill.className = "segment-pill";
            pill.querySelector(".seg-icon").textContent = "○";
        });
    }

    function startStreaming() {
        const quality = elements.qualitySelect.value;
        clearFeedback(elements.streamingFeedback);

        clearAllTimers();
        resetStreamingWidget();

        state.currentActivity = "streaming";
        state.streamingState.quality = quality;
        elements.playerQualityTag.textContent = quality;

        setActiveCard(elements.streamingCard);
        setActivityBadges("streaming");
        setSystemStatus(`Simulating: Streaming (${quality} HLS)`, true);

        elements.playBtn.disabled = true;
        elements.pauseBtn.disabled = false;

        state.protocolMessages = buildStreamingSequence(quality);
        state.currentStep = 0;
        state.isPaused = false;

        addActivityLog(`Streaming session started at ${quality}`, "SYSTEM");

        renderTimeline();
        renderCurrentStep();
        scheduleNextStep();
    }

    // ==========================================================================
    // 9. PLAYBACK CONTROLS
    // ==========================================================================
    function pausePlayback() {
        if (!state.protocolMessages.length) return;

        state.isPaused = true;
        clearAllTimers();
        setSystemStatus("Simulation Paused", false);

        if (state.currentActivity === "streaming") {
            elements.playerPlaybackState.className = "player-center-status paused";
            elements.playerPlaybackState.querySelector(".state-icon").textContent = "⏸";
            elements.playerPlaybackState.querySelector(".state-text").textContent = "PAUSED";
        }

        addActivityLog("Playback paused by user", "SYSTEM");
        updateControlButtons();
    }

    function resumePlayback() {
        if (!state.protocolMessages.length) return;

        state.isPaused = false;
        setSystemStatus(`Simulating: ${state.currentActivity.toUpperCase()}`, true);

        if (state.currentActivity === "streaming") {
            elements.playerPlaybackState.className = "player-center-status playing";
            elements.playerPlaybackState.querySelector(".state-icon").textContent = "▶";
            elements.playerPlaybackState.querySelector(".state-text").textContent = "PLAYING";
        }

        addActivityLog("Playback resumed", "SYSTEM");
        updateControlButtons();
        scheduleNextStep();
    }

    function togglePause() {
        if (state.isPaused) {
            resumePlayback();
        } else {
            pausePlayback();
        }
    }

    function nextStep() {
        if (state.currentStep < state.protocolMessages.length - 1) {
            clearAllTimers();
            state.isPaused = true;
            state.currentStep++;
            renderCurrentStep();
            updateControlButtons();
        }
    }

    function previousStep() {
        if (state.currentStep > 0) {
            clearAllTimers();
            state.isPaused = true;
            state.currentStep--;
            renderCurrentStep();
            updateControlButtons();
        }
    }

    function replayActivity() {
        if (!state.protocolMessages.length) return;

        clearAllTimers();
        state.isPaused = false;
        state.currentStep = 0;

        if (state.currentActivity === "streaming") {
            resetStreamingWidget();
            elements.playBtn.disabled = true;
            elements.pauseBtn.disabled = false;
        }

        setSystemStatus(`Replaying: ${state.currentActivity.toUpperCase()}`, true);
        addActivityLog("Activity replayed from step 1", "SYSTEM");

        renderTimeline();
        renderCurrentStep();
        scheduleNextStep();
    }

    function jumpToStep(targetIndex) {
        if (targetIndex < 0 || targetIndex >= state.protocolMessages.length) return;

        clearAllTimers();
        state.isPaused = true;
        state.currentStep = targetIndex;
        renderCurrentStep();
        updateControlButtons();
    }

    // ==========================================================================
    // 10. EVENT LISTENERS
    // ==========================================================================
    function setupEventListeners() {
        // Activity Triggers
        elements.visitBtn.addEventListener("click", startBrowsing);
        elements.urlInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") startBrowsing();
        });

        elements.sendMailBtn.addEventListener("click", startMail);
        elements.playBtn.addEventListener("click", startStreaming);
        elements.pauseBtn.addEventListener("click", togglePause);

        // Quality change while streaming
        elements.qualitySelect.addEventListener("change", () => {
            if (state.currentActivity === "streaming") {
                startStreaming();
            }
        });

        // Playback Controls
        elements.previousBtn.addEventListener("click", previousStep);
        elements.nextBtn.addEventListener("click", nextStep);
        elements.pauseVisualizationBtn.addEventListener("click", togglePause);
        elements.replayBtn.addEventListener("click", replayActivity);

        // Speed Selector
        elements.speedSelect.addEventListener("change", (e) => {
            state.stepInterval = parseInt(e.target.value, 10) || 1800;
            addActivityLog(`Progression speed set to ${state.stepInterval}ms`, "SYSTEM");
        });

        // Copy Payload Button
        elements.copyPayloadBtn.addEventListener("click", () => {
            const textToCopy = elements.msgPayload.textContent;
            if (!textToCopy) return;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = elements.copyPayloadBtn.textContent;
                elements.copyPayloadBtn.textContent = "Copied!";
                setTimeout(() => {
                    elements.copyPayloadBtn.textContent = originalText;
                }, 1500);
            }).catch(() => {
                // Fallback
                elements.copyPayloadBtn.textContent = "Copied!";
                setTimeout(() => {
                    elements.copyPayloadBtn.textContent = "Copy Payload";
                }, 1500);
            });
        });

        // Clear Log
        elements.clearLogBtn.addEventListener("click", () => {
            elements.activityLog.innerHTML = "";
            if (elements.emptyLogPrompt) {
                elements.emptyLogPrompt.style.display = "flex";
                elements.activityLog.appendChild(elements.emptyLogPrompt);
            }
        });

        // Keyboard navigation shortcuts
        window.addEventListener("keydown", (e) => {
            // Ignore if typing in input or textarea
            if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
                return;
            }

            if (e.key === " " || e.key === "k") {
                e.preventDefault();
                togglePause();
            } else if (e.key === "ArrowRight" || e.key === "l") {
                e.preventDefault();
                nextStep();
            } else if (e.key === "ArrowLeft" || e.key === "j") {
                e.preventDefault();
                previousStep();
            } else if (e.key === "r") {
                e.preventDefault();
                replayActivity();
            }
        });
    }

    // ==========================================================================
    // 11. INITIALIZATION
    // ==========================================================================
    function init() {
        setupEventListeners();
        resetTopologyVisuals();
        renderTimeline();
        updateControlButtons();
        addActivityLog("System initialized and ready for application layer activities", "SYSTEM");
        console.log("Application Layer Visualizer initialized successfully.");
    }

    // Run when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();