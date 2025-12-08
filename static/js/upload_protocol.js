document.addEventListener("DOMContentLoaded", function () {
  const add_protocol = document.getElementById("addProtocol");
  const run_button = document.getElementById("runButton");
  const rewind_button = document.getElementById("playButton");
  const protocolInput = document.getElementById("protocolInput");

  // Disable "Run" if the protocol changes
  protocolInput.addEventListener("input", () => {
    run_button.disabled = true;
    rewind_button.disabled = true;
  });

  // Save the protocol and then run simulation (sequential)
  add_protocol.addEventListener("click", async () => {  // <-- Make the callback async
    const protocol = protocolInput.value;

    try {
      // Step 1: Save the protocol
      const saveResponse = await fetch("/save_protocol", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uploaded_protocol: protocol }),
      });

      if (!saveResponse.ok) throw new Error("Failed to save protocol.");
      const saveData = await saveResponse.json();
      console.log("Save response:", saveData);
      alert(saveData.message);

      // Step 2: Automatically run simulation after successful save
      const runResponse = await fetch("/run_simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!runResponse.ok) throw new Error("Simulation failed.");
      const runData = await runResponse.json();
      console.log("Run response:", runData);
      alert(runData.message);

      run_button.disabled = false;
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    }
  });
});