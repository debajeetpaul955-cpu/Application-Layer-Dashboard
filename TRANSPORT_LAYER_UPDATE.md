# Transport Layer Upgrade

This version extends the original Application Layer Protocol Visualizer with a deep educational Transport Layer simulation.

## Added
- TCP and UDP identification for each application event.
- Source/destination ports.
- TCP three-way handshake: SYN, SYN-ACK, ACK.
- TCP sequence and acknowledgment numbers.
- TCP flags and connection states.
- TCP receive window / flow-control visualization.
- MSS and simulated congestion-window information.
- TCP checksum and header-length fields.
- TCP payload/segment sizing and multi-segment indication.
- Graceful TCP four-step termination: FIN, ACK, FIN, final ACK.
- UDP datagram fields for DNS events.
- Interactive TCP packet-loss/retransmission demonstration.
- Expandable TCP header reference.
- Transport Layer Inspector synchronized with the existing protocol timeline.
- Health endpoint version updated to 2.0.0.

## Simulation scope
The dashboard is an educational simulation. It does not capture real network packets or open raw sockets. TCP/UDP values are generated for visualization and teaching purposes.

## Activities
- Web Browsing: DNS over simulated UDP, followed by HTTP/1.1 over simulated TCP.
- Email: DNS MX over simulated UDP, followed by SMTP submission over simulated TCP port 587.
- Media Streaming: DNS over simulated UDP, followed by HTTP/HLS-style requests over simulated TCP.

## Run locally
```bash
python -m venv venv
# Windows PowerShell
venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000`.
