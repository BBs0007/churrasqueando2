import whatsappIcon from "@/assets/whatsapp-icon.png";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=59175358008&text&type=phone_number&app_absent=0";

export function WhatsAppFab() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
    >
      <img
        src={whatsappIcon.url}
        alt="WhatsApp"
        className="h-14 w-14 object-contain drop-shadow-lg"
      />
    </a>
  );
}
