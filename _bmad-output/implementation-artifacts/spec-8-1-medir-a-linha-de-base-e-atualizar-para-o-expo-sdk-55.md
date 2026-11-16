---
title: 'Story 8.1: Medir a linha de base e atualizar para o Expo SDK 55'
type: 'chore'
created: '2026-11-16'
status: 'blocked'
---

# Story 8.1: Medir a linha de base e atualizar para o Expo SDK 55

## Auto Run Result

Status: blocked
Blocking condition: missing Android 16 device and Android/Java build toolchain (`adb`, `java`, `gradle`, `ANDROID_HOME` ausentes neste ambiente Linux). A Story 8.1 exige medir o pico de memória das telas principais no SDK 54 em um Android 16 do dono antes de rodar `npx expo install expo@^55 --fix`, além de validar o build de release do Android.
