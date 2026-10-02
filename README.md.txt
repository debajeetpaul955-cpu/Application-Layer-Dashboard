# Application + Transport Layer Dashboard

An interactive educational web-based visualization of Application Layer and Transport Layer protocols.

The dashboard demonstrates how common network activities such as web browsing, email communication, and streaming involve both Application Layer protocols and Transport Layer mechanisms.

---

## 1. Project Overview

This project is an interactive protocol visualizer designed to demonstrate the progression of network communication.

It provides two synchronized views:

- Application Layer
- Transport Layer

The user can select different activities and move through the protocol sequence step-by-step.

The project uses a simulated network model for educational purposes. It does not perform actual packet transmission over the Internet.

---

## 2. Activities Supported

The dashboard demonstrates three major activities.

### A. Web Browsing

The browsing simulation demonstrates:

```text
DNS Query
      ↓
DNS Response
      ↓
TCP SYN
      ↓
TCP SYN-ACK
      ↓
TCP ACK
      ↓
HTTP Request
      ↓
TCP Data Transfer
      ↓
HTTP Response
      ↓
TCP Connection Teardown