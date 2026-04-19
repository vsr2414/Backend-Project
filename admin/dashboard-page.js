const React = require("react");

const DashboardPage = (props) => {
  const dashboardData = props.data || {};
  const summary = dashboardData.summary || {};
  const user = dashboardData.user || {};
  const recentOrders = dashboardData.recentOrders || [];
  const isAdminDashboard = dashboardData.role === "admin";

  const openAdminPage = (path) => {
    window.location.href = path;
  };

  const wrapperStyle = {
    padding: "36px",
    display: "grid",
    gap: "22px",
    fontFamily: "Segoe UI, sans-serif",
    fontSize: "17px",
    lineHeight: 1.6,
  };

  const cardsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  };

  const cardStyle = {
    border: "1px solid #d8dee7",
    borderRadius: "12px",
    padding: "18px",
    background: "#ffffff",
  };

  const headingStyle = {
    margin: 0,
    fontSize: "38px",
    lineHeight: 1.2,
    color: "#1f2a37",
  };

  const sectionStyle = {
    border: "1px solid #d8dee7",
    borderRadius: "12px",
    padding: "22px",
    background: "#ffffff",
  };

  const actionButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "14px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cfd8e3",
    background: "#f8fafc",
    color: "#1f2a37",
    textDecoration: "none",
    fontWeight: 600,
    cursor: "pointer",
  };

  return React.createElement(
    "div",
    {
      style: wrapperStyle,
    },
    React.createElement("h1", { style: headingStyle }, dashboardData.role === "admin" ? "Admin Dashboard" : "My Dashboard"),
    isAdminDashboard
      ? React.createElement(
          "div",
          { style: cardsStyle },
          React.createElement(
            "div",
            { style: cardStyle },
            React.createElement("div", { style: { color: "#4b5563", marginBottom: "6px" } }, "Total Users"),
            React.createElement("strong", { style: { fontSize: "26px" } }, String(summary.totalUsers || 0)),
            React.createElement(
              "a",
              {
                href: "/admin/resources/Users",
                style: actionButtonStyle,
              },
              "View Users"
            )
          ),
          React.createElement(
            "div",
            { style: cardStyle },
            React.createElement("div", { style: { color: "#4b5563", marginBottom: "6px" } }, "Total Products"),
            React.createElement("strong", { style: { fontSize: "26px" } }, String(summary.totalProducts || 0)),
            React.createElement(
              "a",
              {
                href: "/admin/resources/Products",
                style: actionButtonStyle,
              },
              "View Products"
            )
          ),
          React.createElement(
            "div",
            { style: cardStyle },
            React.createElement("div", { style: { color: "#4b5563", marginBottom: "6px" } }, "Total Orders"),
            React.createElement("strong", { style: { fontSize: "26px" } }, String(summary.totalOrders || 0)),
            React.createElement(
              "a",
              {
                href: "/admin/resources/Orders",
                style: actionButtonStyle,
              },
              "View Orders"
            )
          ),
          React.createElement(
            "div",
            { style: cardStyle },
            React.createElement("div", { style: { color: "#4b5563", marginBottom: "6px" } }, "Total Revenue"),
            React.createElement("strong", { style: { fontSize: "26px" } }, `$${Number(summary.totalRevenue || 0).toFixed(2)}`),
            React.createElement(
              "a",
              {
                href: "/admin/resources/Orders",
                style: actionButtonStyle,
              },
              "Open Orders"
            )
          ),
          React.createElement(
            "div",
            { style: cardStyle },
            React.createElement("div", { style: { color: "#4b5563", marginBottom: "6px" } }, "Pending Orders"),
            React.createElement("strong", { style: { fontSize: "26px" } }, String(summary.pendingOrders || 0)),
            React.createElement(
              "a",
              {
                href: "/admin/resources/Orders?filters.status=pending",
                style: actionButtonStyle,
              },
              "View Pending"
            )
          )
        )
      : React.createElement(
          "div",
          { style: { display: "grid", gap: "12px" } },
          React.createElement(
            "div",
            { style: sectionStyle },
            React.createElement("h2", { style: { marginTop: 0, fontSize: "26px" } }, "Profile"),
            React.createElement("p", null, `Name: ${user.name || "-"}`),
            React.createElement("p", { style: { marginBottom: 0 } }, `Email: ${user.email || "-"}`)
          ),
          React.createElement("h2", { style: { marginBottom: 0, fontSize: "26px" } }, "Recent Orders"),
          React.createElement(
            "div",
            { style: sectionStyle },
            recentOrders.length === 0
              ? React.createElement(
                  "p",
                  { style: { margin: 0 } },
                  "No recent orders found."
                )
              : React.createElement(
                  "table",
                  { style: { width: "100%", borderCollapse: "collapse" } },
                  React.createElement(
                    "thead",
                    null,
                    React.createElement(
                      "tr",
                      null,
                      React.createElement("th", { style: { textAlign: "left", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" } }, "Order"),
                      React.createElement("th", { style: { textAlign: "left", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" } }, "Status"),
                      React.createElement("th", { style: { textAlign: "left", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" } }, "Items"),
                      React.createElement("th", { style: { textAlign: "left", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" } }, "Total")
                    )
                  ),
                  React.createElement(
                    "tbody",
                    null,
                    recentOrders.map((order) =>
                      React.createElement(
                        "tr",
                        { key: order.id },
                        React.createElement("td", { style: { padding: "8px 0" } }, `#${order.id}`),
                        React.createElement("td", { style: { padding: "8px 0" } }, order.status),
                        React.createElement("td", { style: { padding: "8px 0" } }, String(order.itemsCount || 0)),
                        React.createElement("td", { style: { padding: "8px 0" } }, `$${Number(order.totalAmount || 0).toFixed(2)}`)
                      )
                    )
                  )
                )
          )
        ));
};

module.exports = DashboardPage;
