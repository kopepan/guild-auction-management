import "./load-env";
import { syncDiscordGuildMembers } from "@/lib/discord-members";

async function main() {
  const result = await syncDiscordGuildMembers();
  console.log(
    `Synced ${result.total} Discord members (${result.created} new, ${result.updated} updated, ${result.deactivated} deactivated).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
