// PIX EMV payload generation (pure functions)

export function crc16ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function emvField(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

export function buildPixPayload(pixKey: string): string {
  const merchantInfo =
    emvField("00", "BR.GOV.BCB.PIX") + emvField("01", pixKey);
  const additionalData = emvField("05", "***");

  let payload = "";
  payload += emvField("00", "01");
  payload += emvField("26", merchantInfo);
  payload += emvField("52", "0000");
  payload += emvField("53", "986");
  payload += emvField("58", "BR");
  payload += emvField("59", "Pixel Eucaristico");
  payload += emvField("60", "Goiania");
  payload += emvField("62", additionalData);
  payload += "6304";

  return payload + crc16ccitt(payload);
}
