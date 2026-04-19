const React = require("react");

const SettingsPage = (props) => {
  const initialSettings = (props.data && props.data.settings) || [];
  const initialMessage = (props.data && props.data.message) || "";

  const [settings, setSettings] = React.useState(initialSettings);
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [message, setMessage] = React.useState(initialMessage);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    const response = await fetch("/api/admin/settings", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      setMessage("Unable to load settings.");
      return;
    }

    const json = await response.json();
    setSettings((json && json.settings) || []);
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const normalizedKey = key.trim();
    const keyPattern = /^[a-z][a-z0-9_\-\s]{1,63}$/i;

    if (!normalizedKey) {
      setMessage("Setting key is required.");
      return;
    }

    if (!keyPattern.test(normalizedKey) || !/[a-z]/i.test(normalizedKey)) {
      setMessage("Use 2-64 chars and include at least one letter.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: normalizedKey, value }),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage((json && json.message) || "Unable to update setting.");
        return;
      }

      setMessage((json && json.message) || "Setting updated successfully.");
      setKey("");
      setValue("");
      setSettings((json && json.settings) || []);
    } catch (error) {
      setMessage("Unable to update setting.");
    } finally {
      setIsSaving(false);
    }
  };

  return React.createElement(
    "div",
    {
      style: {
        padding: "28px",
        display: "grid",
        gap: "18px",
        fontFamily: "Segoe UI, sans-serif",
        fontSize: "15px",
      },
    },
    React.createElement("h1", { style: { margin: 0, fontSize: "30px", lineHeight: 1.2 } }, "Settings"),
    React.createElement(
      "p",
      { style: { margin: 0, color: "#4b5563" } },
      "Manage key-value configuration used by the system."
    ),
    React.createElement(
      "form",
      {
        onSubmit,
        style: {
          display: "grid",
          gridTemplateColumns: "2fr 3fr auto",
          gap: "8px",
          alignItems: "end",
          background: "#ffffff",
          border: "1px solid #d8dee7",
          borderRadius: "10px",
          padding: "14px",
        },
      },
      React.createElement(
        "label",
        { style: { display: "grid", gap: "4px" } },
        React.createElement("span", null, "Key"),
        React.createElement("input", {
          value: key,
          onChange: (event) => setKey(event.target.value),
          placeholder: "store_name",
          minLength: 2,
          maxLength: 64,
          required: true,
        })
      ),
      React.createElement(
        "label",
        { style: { display: "grid", gap: "4px" } },
        React.createElement("span", null, "Value"),
        React.createElement("input", {
          value,
          onChange: (event) => setValue(event.target.value),
          placeholder: "Demo eCommerce Store",
        })
      ),
      React.createElement(
        "button",
        {
          type: "submit",
          disabled: isSaving,
          style: {
            height: "38px",
            minWidth: "86px",
          },
        },
        isSaving ? "Saving..." : "Save"
      )
    ),
    message
      ? React.createElement(
          "p",
          {
            style: {
              margin: 0,
              color: "#1f2a37",
              fontWeight: 600,
            },
          },
          message
        )
      : null,
    React.createElement(
      "button",
      {
        type: "button",
        onClick: loadSettings,
        style: { width: "130px", height: "36px" },
      },
      "Refresh"
    ),
    React.createElement(
      "div",
      {
        style: {
          background: "#ffffff",
          border: "1px solid #d8dee7",
          borderRadius: "10px",
          overflow: "hidden",
        },
      },
      React.createElement(
        "table",
        {
          style: {
            width: "100%",
            borderCollapse: "collapse",
          },
        },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", { style: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" } }, "Key"),
            React.createElement("th", { style: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" } }, "Value")
          )
        )
        ,
        React.createElement(
          "tbody",
          null,
          settings.map((setting) =>
          React.createElement(
            "tr",
            { key: setting.id },
            React.createElement("td", { style: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" } }, setting.key),
            React.createElement("td", { style: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", whiteSpace: "pre-wrap" } }, setting.value)
          )
          )
        )
      )
    )
  );
};

module.exports = SettingsPage;
