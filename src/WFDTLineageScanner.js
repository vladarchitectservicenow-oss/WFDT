/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: MIT
 *
 * WFDT — Workflow Data Fabric Tracker
 * Scope: x_wfdt
 * Scans sys_data_source, sys_import_set, sys_hub_flow_output, and sys_metadata_link
 * for orphaned assets with missing parent lineage.
 */
var WFDTLineageScanner = Class.create();
WFDTLineageScanner.prototype = {
    initialize: function() {
        this.version = "1.0.0";
        this.DATA_PRODUCT_TABLES = [
            "sys_data_source",
            "sys_import_set",
            "sys_hub_flow_output",
            "sys_metadata_link"
        ];
    },

    scanLineage: function() {
        var out = {
            dataProducts: [],
            orphanedAssets: 0,
            totalAssets: 0,
            scanDate: new GlideDateTime().getDisplayValue()
        };
        for (var i = 0; i < this.DATA_PRODUCT_TABLES.length; i++) {
            var table = this.DATA_PRODUCT_TABLES[i];
            try {
                var gr = new GlideRecord(table);
                gr.query();
                while (gr.next()) {
                    out.totalAssets++;
                    var hasParent = this._hasParentLineage(gr, table);
                    if (!hasParent) out.orphanedAssets++;
                    out.dataProducts.push({
                        table: table,
                        sys_id: gr.getUniqueValue(),
                        name: gr.getValue("name") || "(unnamed)",
                        orphaned: !hasParent,
                        updated: gr.getValue("sys_updated_on") || ""
                    });
                }
            } catch (e) {
                gs.warn("WFDT scanner error on " + table + ": " + e.message);
            }
        }
        return out;
    },

    _hasParentLineage: function(gr, table) {
        if (table === "sys_data_source") {
            return !!gr.getValue("sys_source_sys_id") || !!gr.getValue("source");
        }
        if (table === "sys_import_set") {
            return !!gr.getValue("source") || !!gr.getValue("data_source");
        }
        if (table === "sys_hub_flow_output") {
            return !!gr.getValue("flow") || !!gr.getValue("parent_flow");
        }
        if (table === "sys_metadata_link") {
            return !!gr.getValue("url") || (!!gr.getValue("table") && !!gr.getValue("document_key"));
        }
        return true;
    },

    type: "WFDTLineageScanner"
};
