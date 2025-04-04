#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// ประกาศโปรโตไทป์ของฟังก์ชัน
void sendBufferData();
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len);

// WiFi Credentials
const char* ssid = "iPhone"; // แก้ไขเป็น SSID ของ WiFi คุณ
const char* password = "nontakorn"; // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ

// WebServer และ WebSocket
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// สถานะการเชื่อมต่อและการทำงาน
bool deviceConnected = false;
bool oldDeviceConnected = false;
String receivedCommand = "";

// AD8232 Pins
const int LO_POSITIVE = 13;
const int LO_NEGATIVE = 12;
const int OUTPUT_PIN = 34;

const int SAMPLING_RATE = 360;
const unsigned long SAMPLE_INTERVAL = 1000000 / SAMPLING_RATE;
unsigned long lastSampleTime = 0;

int currentLead = 1;
const int BUFFER_SIZE = 1800;
int ecgBuffer[BUFFER_SIZE];
int bufferIndex = 0;
bool bufferFull = false;

String status = "READY";

// ฟังก์ชันสำหรับการจัดการเหตุการณ์ WebSocket
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("📶 WebSocket Client #%u Connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      deviceConnected = true;
      client->text("STATUS:READY");
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("🔌 WebSocket Client #%u Disconnected\n", client->id());
      deviceConnected = false;
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    receivedCommand = (char*)data;
    receivedCommand.trim();
    Serial.println("📩 Received: " + receivedCommand);

    if (receivedCommand == "START") {
      bufferIndex = 0;
      bufferFull = false;
      status = "MEASURING";
      ws.textAll("STATUS:MEASURING");
      Serial.println("▶️ Started measuring");
    } else if (receivedCommand == "STOP") {
      status = "READY";
      ws.textAll("STATUS:READY");
      Serial.println("⏹️ Stopped measuring");
    } else if (receivedCommand.startsWith("LEAD:")) {
      currentLead = receivedCommand.substring(5).toInt();
      String leadMsg = "LEAD:" + String(currentLead);
      ws.textAll(leadMsg.c_str());
      Serial.println("🔄 Changed lead to: " + String(currentLead));
    } else if (receivedCommand == "SEND") {
      Serial.println("📤 Sending buffer data");
      sendBufferData();
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== WatJai ECG WiFi ===");

  // ตั้งค่าพินสำหรับ AD8232
  pinMode(LO_POSITIVE, INPUT);
  pinMode(LO_NEGATIVE, INPUT);
  pinMode(OUTPUT_PIN, INPUT);
  analogReadResolution(12);
  Serial.println("✓ AD8232 pins configured");

  // Initialize SPIFFS (ระบบไฟล์)
  if(!SPIFFS.begin(true)){
    Serial.println("❌ An Error has occurred while mounting SPIFFS");
    return;
  }
  Serial.println("✓ SPIFFS initialized");

  // เชื่อมต่อ WiFi
  WiFi.begin(ssid, password);
  Serial.print("🔄 Connecting to WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("✓ WiFi connected");
  Serial.println("✓ IP address: " + WiFi.localIP().toString());

  // ตั้งค่า WebSocket
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);
  Serial.println("✓ WebSocket server started");

  // จัดการไฟล์จาก SPIFFS สำหรับเว็บอินเตอร์เฟซ (ถ้ามี)
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");

  // เริ่ม HTTP server
  server.begin();
  Serial.println("✓ HTTP server started");
  Serial.println("✓ Ready for connections");
  Serial.println("Device name: WatJai_ECG");
  Serial.println("Connect to: http://" + WiFi.localIP().toString());
}

void loop() {
  // ทำความสะอาด WebSocket clients
  ws.cleanupClients();
  
  // ตรวจสอบการวัดและทำการวัด
  if (deviceConnected && status == "MEASURING") {
    unsigned long currentTime = micros();
    if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {
      lastSampleTime = currentTime;

      if ((digitalRead(LO_POSITIVE) == 1) || (digitalRead(LO_NEGATIVE) == 1)) {
        ws.textAll("LEADS:OFF");
        Serial.println("⚠️ Leads are not connected");
      } else {
        int ecgValue = analogRead(OUTPUT_PIN);
        ecgBuffer[bufferIndex] = ecgValue;
        bufferIndex++;

        // ส่งข้อมูลแบบเรียลไทม์ทุก 10 ตัวอย่าง
        if (bufferIndex % 10 == 0) {
          ws.textAll(String(ecgValue));
        }

        if (bufferIndex >= BUFFER_SIZE) {
          bufferFull = true;
          status = "READY";
          ws.textAll("BUFFER:FULL");
          Serial.println("📦 Buffer is full");
        }
      }
    }
  }
  
  // ตรวจสอบการเชื่อมต่อ/ตัดการเชื่อมต่อ
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    oldDeviceConnected = deviceConnected;
    Serial.println("🔌 Client Disconnected");
  }
  
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("✅ Connection state updated");
  }
}

// ฟังก์ชันส่งข้อมูลจากบัฟเฟอร์ไปยังแอป
void sendBufferData() {
  if (bufferFull || bufferIndex > 0) {
    ws.textAll("DATA:START");
    delay(5);

    String leadInfo = "LEAD:" + String(currentLead);
    ws.textAll(leadInfo.c_str());
    delay(5);

    String sampleCount = "SAMPLES:" + String(bufferIndex);
    ws.textAll(sampleCount.c_str());
    delay(5);

    // ส่งข้อมูลเป็นชุด (20 ตัวอย่างต่อการส่ง) เพื่อความเร็วและประสิทธิภาพ
    const int CHUNK_SIZE = 20;
    for (int i = 0; i < bufferIndex; i += CHUNK_SIZE) {
      String dataChunk = "";
      int end = min(i + CHUNK_SIZE, bufferIndex);
      
      for (int j = i; j < end; j++) {
        dataChunk += String(ecgBuffer[j]);
        if (j < end - 1) {
          dataChunk += ",";
        }
      }
      
      ws.textAll(dataChunk.c_str());
      delay(5);
    }

    ws.textAll("DATA:END");

    Serial.println("📤 ECG data sent: " + String(bufferIndex) + " samples");

    bufferIndex = 0;
    bufferFull = false;
  } else {
    ws.textAll("BUFFER:EMPTY");
    Serial.println("⚠️ Buffer is empty, no data to send");
  }
}