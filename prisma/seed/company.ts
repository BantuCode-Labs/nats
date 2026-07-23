import { prisma } from "./utils";

export async function seedCompany() {
  console.log("Menyiapkan profil perusahaan...");

  const companyProfile = {
    name: "PT NATS Akuntansi Nusantara",
    address: "Jl. Sudirman No. 45, Jakarta Selatan 12190",
    phone: "021-5550123",
    email: "info@nats.co.id",
    website: "https://nats.co.id",
    taxId: "10.0.0.1-012.000",
    currency: "IDR",
    locale: "id-ID",
    timezone: "Asia/Jakarta",
  };

  const existingProfile = await prisma.companyProfile.findFirst();
  if (!existingProfile) {
    await prisma.companyProfile.create({
      data: companyProfile,
    });
  } else {
    // Perbarui default mata uang/locale jika masih nilai bawaan USD/en-US
    const needsIdUpdate =
      existingProfile.currency === "USD" ||
      existingProfile.locale === "en-US" ||
      existingProfile.timezone === "UTC";

    if (needsIdUpdate) {
      await prisma.companyProfile.update({
        where: { id: existingProfile.id },
        data: {
          currency: "IDR",
          locale: "id-ID",
          timezone: "Asia/Jakarta",
          name: existingProfile.name === "NATS Accounting"
            ? companyProfile.name
            : existingProfile.name,
          address:
            existingProfile.address === "123 Business Rd, Tech City"
              ? companyProfile.address
              : existingProfile.address,
          phone:
            existingProfile.phone === "555-0100"
              ? companyProfile.phone
              : existingProfile.phone,
          email:
            existingProfile.email === "contact@nats.com"
              ? companyProfile.email
              : existingProfile.email,
          website:
            existingProfile.website === "https://nats.com"
              ? companyProfile.website
              : existingProfile.website,
          taxId:
            existingProfile.taxId === "123-456-789"
              ? companyProfile.taxId
              : existingProfile.taxId,
        },
      });
      console.log("Profil perusahaan diperbarui ke IDR / id-ID.");
    } else {
      console.log("Profil perusahaan sudah ada.");
    }
  }
}
