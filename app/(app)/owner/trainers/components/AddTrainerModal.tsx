"use client";

import InviteUserModal from "../../components/InviteUserModal";

type AddTrainerModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AddTrainerModal({
  open,
  onClose,
}: AddTrainerModalProps) {
  return (
    <InviteUserModal
      open={open}
      role="Trainer"
      title="Dodaj trenera"
      description="Wpisz adres e-mail trenera. Wyślemy zaproszenie do utworzenia konta i panelu trenera."
      submitLabel="Dodaj trenera"
      emailPlaceholder="trainer@atlas-crm.com"
      toastScope="owner-trainer"
      successMessage="Zaproszenie dla trenera zostało wysłane."
      onClose={onClose}
    />
  );
}
