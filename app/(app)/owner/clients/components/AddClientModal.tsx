"use client";

import InviteUserModal from "../../components/InviteUserModal";

type AddClientModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddClientModal({ open, onClose }: AddClientModalProps) {
  return (
    <InviteUserModal
      open={open}
      role="Client"
      title="Dodaj klienta"
      description="Wpisz adres e-mail klienta. Wyślemy zaproszenie do utworzenia konta i panelu klienta."
      submitLabel="Dodaj klienta"
      emailPlaceholder="client@atlas-crm.com"
      toastScope="owner-client"
      successMessage="Zaproszenie dla klienta zostało wysłane."
      onClose={onClose}
    />
  );
}
