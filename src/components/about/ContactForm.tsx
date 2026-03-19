import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { TInput } from "@/src/components/tamagui";
import { Feather } from "@expo/vector-icons";
import { EmailService } from "@/src/modules/security/application/EmailService";
import type { ContactFormData } from "@/src/modules/security/application/EmailService";
import { DeviceInfoService } from "@/src/modules/security/infrastructure/DeviceInfoService";
import { soundManager } from "@/src/services/SoundManager";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContactFormProps {
  theme: any;
}

export function ContactForm({ theme }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});

  const emailRef = useRef<TextInput>(null);
  const subjectRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<string, string>> = {};
    if (!name.trim()) errors.name = "Nome é obrigatório.";
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "E-mail inválido.";
    }
    if (!subject.trim()) errors.subject = "Assunto é obrigatório.";
    if (!message.trim()) errors.message = "Mensagem é obrigatória.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, subject, message]);

  const handleSendEmail = useCallback(async () => {
    if (!validateForm()) return;
    setSending(true);
    const form: ContactFormData = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    };
    const deviceInfo = DeviceInfoService.get();
    await EmailService.open(form, deviceInfo);
    setSending(false);
  }, [name, email, subject, message, validateForm]);

  return (
    <>
      <Text style={[s.bodyText, { color: theme.secondaryText }]}>
        Envie sugestões, bugs ou dúvidas. Abrirá seu cliente de e-mail
        com as informações preenchidas.
      </Text>

      <FormField
        label="Nome"
        value={name}
        onChangeText={(v) => { setName(v); setFormErrors((e) => ({ ...e, name: undefined })); }}
        error={formErrors.name}
        placeholder="Seu nome"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        theme={theme}
      />
      <FormField
        ref={emailRef}
        label="E-mail"
        value={email}
        onChangeText={(v) => { setEmail(v); setFormErrors((e) => ({ ...e, email: undefined })); }}
        error={formErrors.email}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => subjectRef.current?.focus()}
        theme={theme}
      />
      <FormField
        ref={subjectRef}
        label="Assunto"
        value={subject}
        onChangeText={(v) => { setSubject(v); setFormErrors((e) => ({ ...e, subject: undefined })); }}
        error={formErrors.subject}
        placeholder="Qual é o assunto?"
        returnKeyType="next"
        onSubmitEditing={() => messageRef.current?.focus()}
        theme={theme}
      />
      <FormField
        ref={messageRef}
        label="Mensagem"
        value={message}
        onChangeText={(v) => { setMessage(v); setFormErrors((e) => ({ ...e, message: undefined })); }}
        error={formErrors.message}
        placeholder="Descreva sua mensagem…"
        multiline
        numberOfLines={5}
        returnKeyType="done"
        theme={theme}
      />

      <TouchableOpacity
        style={[
          s.submitBtn,
          { backgroundColor: theme.primaryColor },
          sending && s.submitBtnDisabled,
        ]}
        onPress={() => { soundManager.play("success"); handleSendEmail(); }}
        disabled={sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Feather name="send" size={17} color="#fff" />
        )}
        <Text style={s.submitBtnText}>
          {sending ? "Abrindo e-mail…" : "Enviar mensagem"}
        </Text>
      </TouchableOpacity>
    </>
  );
}

// ── FormField ──────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
  returnKeyType?: TextInput["props"]["returnKeyType"];
  onSubmitEditing?: () => void;
  theme: any;
}

const FormField = React.forwardRef<TextInput, FormFieldProps>(
  (
    {
      label,
      value,
      onChangeText,
      error,
      placeholder,
      multiline,
      numberOfLines,
      keyboardType,
      autoCapitalize,
      returnKeyType,
      onSubmitEditing,
      theme,
    },
    ref,
  ) => {
    return (
      <View style={formStyles.container}>
        <Text style={[formStyles.label, { color: theme.secondaryText }]}>
          {label}
        </Text>
        {multiline ? (
          <TextInput
            ref={ref}
            style={[
              formStyles.input,
              {
                backgroundColor: theme.background,
                color: theme.textColor,
                borderColor: error ? theme.danger : theme.border,
                textAlignVertical: "top",
                height: 96,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.secondaryText + "70"}
            multiline
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize ?? "words"}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={false}
          />
        ) : (
          <TInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.secondaryText + "70"}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize ?? "words"}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            borderColor={error ? theme.danger : theme.border}
            background={theme.background}
            color={theme.textColor}
          />
        )}
        {error != null && (
          <Text style={[formStyles.error, { color: theme.danger }]}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);
FormField.displayName = "FormField";

const formStyles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  error: { fontFamily: "DMSans_400Regular", fontSize: 11 },
});

const s = StyleSheet.create({
  bodyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 2,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#fff",
  },
});
