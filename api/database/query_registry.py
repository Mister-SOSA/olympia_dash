"""Centralized query registry for widget data access.

This module maps trusted query identifiers to query builder
configurations so that the API can construct SQL safely without
trusting client-supplied table names or SQL snippets.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Dict, Optional, Set

DATE_FORMAT = "%Y-%m-%d"

_TOP_PRODUCT_CODES = [
    "1130",
    "1220",
    "1140",
    "1210",
    "270",
    "270C",
    "1040",
    "H1410",
    "H1220",
    "H1140",
    "H405",
    "H00132",
    "1001",
    "402",
    "502",
    "504",
    "407",
    "1410-C",
    "1220-C",
    "10906",
    "10907",
    "286",
    "287",
    "100",
    "104",
]

_MACHINE_CODES = [
    "HERA",
    "HERA-2",
    "ELECTRA",
    "ELECTRA-2",
    "ATHENA",
    "ATHENA-2",
    "ZEUS",
    "ZEUS-2",
    "APOLLO",
    "APOLLO-2",
    "TITAN",
    "TITAN-2",
    "SPARTAN",
    "SPARTAN-2",
    "XL-ELECTRICMACHINE",
    "XL-ELECTRICMACHINE 240V USED",
    "XL-ELECTRICMACHINE208V-USED",
    "XL-ELECTRICMACHINE240V",
    "XL-LPMACHINE",
    "XL-LPMACHINE USED",
    "XL-MINIMACHINE",
    "XL-MINIMACHINE USED",
    "XL-NEW 4LG NEW 2K",
    "XL-NEWMACHINE",
    "XL-USED 4LG NAT",
    "XL-USED 4LG NAT 2K",
]


def _validate_iso_date(date_str: str, *, field: str) -> str:
    if not isinstance(date_str, str):
        raise QueryRegistryError(f"Parameter '{field}' must be a string in YYYY-MM-DD format")
    try:
        datetime.strptime(date_str, DATE_FORMAT)
    except ValueError as exc:
        raise QueryRegistryError(
            f"Parameter '{field}' must be in YYYY-MM-DD format"
        ) from exc
    return date_str


def _quote_list(values: list[str]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def _require_str_param(source: Dict[str, Any], key: str, *, field: str) -> str:
    value = source.get(key)
    if not isinstance(value, str):
        raise QueryRegistryError(f"Parameter '{field}' is required and must be a string")
    return value


class QueryRegistryError(Exception):
    """Raised when a query lookup or build fails."""


class QueryRegistry:
    """In-memory registry of approved queries keyed by query_id."""

    _registry: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register(
        cls,
        query_id: str,
        builder: Callable[[Dict[str, Any]], Dict[str, Any]],
        *,
        allowed_roles: Optional[Set[str]] = None,
    ) -> None:
        if query_id in cls._registry:
            raise QueryRegistryError(f"Query '{query_id}' is already registered")
        cls._registry[query_id] = {
            "builder": builder,
            "allowed_roles": allowed_roles,
        }

    @classmethod
    def build_query(
        cls,
        query_id: str,
        params: Optional[Dict[str, Any]] = None,
        user_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        definition = cls._registry.get(query_id)
        if not definition:
            raise QueryRegistryError(f"Unknown query id '{query_id}'")

        allowed_roles = definition.get("allowed_roles")
        if allowed_roles and user_role and user_role not in allowed_roles:
            raise QueryRegistryError("Insufficient permissions for query")

        builder: Callable[[Dict[str, Any]], Dict[str, Any]] = definition["builder"]
        query_config = builder(params or {})

        if not isinstance(query_config, dict):
            raise QueryRegistryError(
                f"Query builder for '{query_id}' must return a dict; got {type(query_config)!r}"
            )

        if "table" not in query_config and "custom_sql" not in query_config:
            raise QueryRegistryError(
                f"Query '{query_id}' definition must include either 'table' or 'custom_sql'"
            )

        return query_config


# ---------------------------------------------------------------------------
# Built-in query registrations
# ---------------------------------------------------------------------------


def _validate_no_params(params: Dict[str, Any]) -> None:
    if params:
        raise QueryRegistryError("This query does not accept parameters")


def _register_static_queries() -> None:
    QueryRegistry.register(
        "SalesByDayBar",
        builder=lambda params: _sales_by_day_bar(params),
    )

    QueryRegistry.register(
        "Overview",
        builder=lambda params: _overview(params),
    )

    QueryRegistry.register(
        "OutstandingOrdersTable",
        builder=lambda params: _outstanding_orders(params),
    )

    QueryRegistry.register(
        "DailyDueInTable",
        builder=lambda params: _daily_due_in(params),
    )

    QueryRegistry.register(
        "DailyDueInHiddenVendTable",
        builder=lambda params: _daily_due_in_hidden_vendors(params),
    )

    QueryRegistry.register(
        "InventoryMovesLog",
        builder=lambda params: _inventory_moves_log(params),
    )

    QueryRegistry.register(
        "MachineStockStatus",
        builder=lambda params: _machine_stock_status(params),
    )

    QueryRegistry.register(
        "TopProductUnitSales",
        builder=lambda params: _top_product_unit_sales(params),
    )

    QueryRegistry.register(
        "SalesByMonthBar",
        builder=lambda params: _sales_by_month(params),
    )

    QueryRegistry.register(
        "SalesByMonthComparisonBar",
        builder=lambda params: _sales_by_month_comparison(params),
    )

    QueryRegistry.register(
        "DailyMovesByUser",
        builder=lambda params: _daily_moves_by_user(params),
    )

    QueryRegistry.register(
        "DailyProductionPutawaysBar",
        builder=lambda params: _daily_production_putaways(params),
    )

    QueryRegistry.register(
        "TopCustomersThisYearPie",
        builder=lambda params: _top_customers_year(params),
    )


def _sales_by_day_bar(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "olympia_SalesByDay",
        "columns": ["period", "total"],
        "sort": ["period ASC"],
    }


def _overview(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "olympia_OverviewSales",
        "columns": ["period", "total"],
        "sort": ["period ASC"],
    }


def _outstanding_orders(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "olympia_OutstandingDueIn",
        "columns": [
            "po_number",
            "po_status",
            "vend_code",
            "vend_name",
            "part_code",
            "part_desc",
            "recent_unit_price",
            "recent_date_orderd",
            "vend_prom_date",
            "date_prom_user",
            "part_type",
            "qty_ord",
            "uom",
            "item_no",
            "last_order_date",
            "last_order_unit_price",
        ],
        "sort": ["po_number ASC", "vend_prom_date ASC"],
    }


def _daily_due_in(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "poitem p",
        "columns": [
            "p.po_number",
            "ph.po_status AS po_status",
            "p.vend_code",
            "p.vend_name",
            "p.part_code",
            "p.part_desc",
            "p.unit_price",
            "p.date_orderd",
            "p.vend_prom_date",
            "p.item_no",
            "p.part_type",
            "p.date_rcv",
            "p.qty_ord",
            "p.qty_recvd",
            "p.uom",
        ],
        "join": {
            "type": "LEFT",
            "table": "pohead ph",
            "on": "p.po_number = ph.po_number",
        },
        "filters": "p.date_orderd >= DATEADD(DAY, -90, GETDATE())",
    }


def _daily_due_in_hidden_vendors(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "poitem p",
        "columns": [
            "p.po_number",
            "ph.po_status AS po_status",
            "p.vend_code",
            "p.vend_name",
            "p.part_code",
            "p.part_desc",
            "p.unit_price",
            "p.date_orderd",
            "p.vend_prom_date",
            "p.item_no",
            "p.part_type",
            "p.date_rcv",
            "p.qty_ord",
            "p.qty_recvd",
            "p.uom",
        ],
        "join": {
            "type": "LEFT",
            "table": "pohead ph",
            "on": "p.po_number = ph.po_number",
        },
        "filters": "p.date_orderd >= DATEADD(DAY, -90, GETDATE())",
    }


def _inventory_moves_log(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "matlxfer",
        "columns": [
            "xfer_date",
            "xfer_time",
            "xfer_user",
            "xtype",
            "xfer_part_code",
            "xfer_qty",
            "fmid",
            "toid",
            "xfer_doc",
            "xfer_lot",
        ],
        "sort": ["xfer_date DESC", "xfer_time DESC"],
        "limit": 50,
    }


def _machine_stock_status(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "inventory",
        "columns": [
            "part_code",
            "part_desc",
            "cost_ctr",
            "available",
            "on_hand",
            "on_hold",
        ],
        "filters": f"part_code IN ({_quote_list(_MACHINE_CODES)})",
        "sort": ["part_code ASC"],
    }


def _top_product_unit_sales(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "shpordview",
        "columns": [
            "part_code",
            "part_desc",
            "qty_ship_unt",
            "trans_year",
            "trans_mo",
        ],
        "filters": (
            f"part_code IN ({_quote_list(_TOP_PRODUCT_CODES)}) "
            "AND qty_ship_unt > 0 "
            "AND trans_datetime >= DATEADD(MONTH, -12, DATEADD(DAY, 1, EOMONTH(GETDATE())))"
        ),
        "sort": ["trans_datetime DESC", "part_code ASC"],
    }


def _sales_by_month(params: Dict[str, Any]) -> Dict[str, Any]:
    _validate_no_params(params)
    return {
        "table": "sumsales",
        "columns": [
            "FORMAT(sale_date, 'yyyy-MM') AS period",
            "SUM(sales_dol) AS total",
        ],
        "filters": "(sale_date >= DATEADD(MONTH, -12, GETDATE()) AND sale_date <= GETDATE())",
        "group_by": ["FORMAT(sale_date, 'yyyy-MM')"],
        "sort": ["period ASC"],
    }


def _sales_by_month_comparison(params: Dict[str, Any]) -> Dict[str, Any]:
    current = params.get("current") if isinstance(params, dict) else None
    last_year = params.get("lastYear") if isinstance(params, dict) else None

    if not isinstance(current, dict):
        raise QueryRegistryError("Parameter 'current' is required and must be an object")
    if not isinstance(last_year, dict):
        raise QueryRegistryError("Parameter 'lastYear' is required and must be an object")

    current_start = _validate_iso_date(
        _require_str_param(current, "start", field="current.start"),
        field="current.start",
    )
    current_end = _validate_iso_date(
        _require_str_param(current, "end", field="current.end"),
        field="current.end",
    )
    last_start = _validate_iso_date(
        _require_str_param(last_year, "start", field="lastYear.start"),
        field="lastYear.start",
    )
    last_end = _validate_iso_date(
        _require_str_param(last_year, "end", field="lastYear.end"),
        field="lastYear.end",
    )

    filters = (
        "("
        f"(sale_date >= '{current_start}' AND sale_date <= '{current_end}') "
        "OR "
        f"(sale_date >= '{last_start}' AND sale_date <= '{last_end}')"
        ")"
    )

    return {
        "table": "sumsales",
        "columns": [
            "FORMAT(sale_date, 'yyyy-MM') AS period",
            "SUM(sales_dol) AS total",
            "YEAR(sale_date) AS year",
        ],
        "filters": filters,
        "group_by": ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
        "sort": ["period ASC", "year ASC"],
    }


def _daily_moves_by_user(params: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(params, dict):
        raise QueryRegistryError("Params must be an object")
    current_date = _validate_iso_date(
        _require_str_param(params, "currentDate", field="currentDate"),
        field="currentDate",
    )

    return {
        "table": "inadjinf",
        "columns": ["user_id", "COUNT(*) as moves"],
        "group_by": ["inadjinf.user_id"],
        "filters": f"trans_date = '{current_date}' AND user_id != 'AUTO'",
        "sort": ["moves DESC"],
    }


def _daily_production_putaways(params: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(params, dict):
        raise QueryRegistryError("Params must be an object")
    current_date = _validate_iso_date(
        _require_str_param(params, "currentDate", field="currentDate"),
        field="currentDate",
    )

    return {
        "table": "putaway",
        "columns": [
            "part_code",
            "SUM(lotqty) AS lotqty",
            "MAX(uom) AS uom",
        ],
        "filters": f"recdat = '{current_date}' AND source_type = 'MF'",
        "group_by": ["part_code"],
        "sort": ["lotqty DESC"],
    }


def _top_customers_year(params: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(params, dict):
        raise QueryRegistryError("Params must be an object")

    start_of_year = _validate_iso_date(
        _require_str_param(params, "startOfYear", field="startOfYear"),
        field="startOfYear",
    )
    end_date = _validate_iso_date(
        _require_str_param(params, "endDate", field="endDate"),
        field="endDate",
    )

    filters = (
        "(sumsales.sale_date >= '{start}' AND sumsales.sale_date <= '{end}')"
    ).format(start=start_of_year, end=end_date)

    return {
        "table": "sumsales",
        "columns": [
            "sumsales.cust_code",
            "orderfrom.bus_name AS businessName",
            "SUM(sumsales.sales_dol) AS totalSales",
            "SUM(sumsales.qty_sold) AS total_quantity_sold",
        ],
        "join": {
            "table": "orderfrom",
            "on": "sumsales.cust_code = orderfrom.cust_code",
            "type": "LEFT",
        },
        "filters": filters,
        "group_by": ["sumsales.cust_code", "orderfrom.bus_name"],
        "sort": ["totalSales DESC"],
    }


_register_static_queries()

__all__ = ["QueryRegistry", "QueryRegistryError"]
