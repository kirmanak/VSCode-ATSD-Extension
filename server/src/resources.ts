export const requiredSectionSettingsMap: Map<string, string[][]> = new Map<string, string[][]>();
requiredSectionSettingsMap.set("series", [
    ["entity", "value"],
    ["metric", "table", "value", "attribute"],
]);
requiredSectionSettingsMap.set("widget", [["type"]]);

export const parentSections: Map<string, string[]> = new Map<string, string[]>();
parentSections.set("widget", ["group", "configuration"]);
parentSections.set("series", ["widget"]);

// Returns array of parent sections for the section
export const getParents: (section: string) => string[] = (section: string): string[] => {
    const parents: string[] = [];
    const found: string[] = parentSections.get(section);
    if (found) {
        found.forEach((father: string) => {
            parents.push(father);
            getParents(father)
                .forEach((grand: string) => parents.push(grand));
        });
    }

    return parents;
};

export const possibleOptions: string[] = [
    "actionenable", "add", "addmeta", "aheadtimespan", "alert", "alertexpression", "alertrowstyle", "alertstyle",
    "alias", "align", "arcs", "arrowlength", "arrows", "attribute", "audio", "audioalert", "audioonload", "author",
    "autoheight", "autopadding", "autoperiod", "autoscale", "axis", "axislabel", "axistitle", "axistitleright", "bar",
    "barcount", "batchsize", "batchupdate", "borderwidth", "bottomaxis", "bundle", "bundled", "buttons", "cache",
    "capitalize", "caption", "captionstyle", "case", "centralizecolumns", "centralizeticks", "changefield", "chartmode",
    "circle", "class", "collapsible", "color", "colorrange", "colors", "columnlabelformat", "columns", "connect",
    "connectvalues", "context", "contextheight", "contextpath", "counter", "counterposition", "current",
    "currentperiodstyle", "data", "datatype", "dayformat", "default", "defaultcolor", "defaultsize", "depth",
    "dialogmaximize", "disablealert", "disconnect", "disconnectcount", "disconnectednodedisplay", "disconnectinterval",
    "disconnectvalue", "display", "displaydate", "displayinlegend", "displaylabels", "displayother", "displaypanels",
    "displaytags", "displayticks", "displaytip", "displaytotal", "displayvalues", "downsample", "downsampledifference",
    "downsamplefactor", "downsamplegap", "dummy", "duration", "effects", "empty", "emptyrefreshinterval",
    "emptythreshold", "enabled", "end", "endtime", "endworkingminutes", "entities", "entitiesbatchupdate", "entity",
    "entityexpression", "entitygroup", "entitylabel", "error", "errorrefreshinterval", "exact", "exactmatch", "expand",
    "expandpanels", "expandtags", "expiretimespan", "fasten", "fillvalue", "filter", "filterrange", "fitsvg",
    "fontscale", "fontsize", "forecast", "forecastname", "forecaststyle", "format", "formataxis", "formatcounter",
    "formatheaders", "formatnumbers", "formatsize", "formattip", "frequency", "gradientcount", "gradientintensity",
    "group", "groupfirst", "groupinterpolate", "groupinterpolateextend", "groupkeys", "grouplabel", "groupperiod",
    "groups", "groupstatistic", "header", "headerstyle", "heightunits", "hidden", "hide", "hidecolumn",
    "hideemptycolumns", "hideemptyseries", "hideifempty", "horizontal", "horizontalgrid", "hourformat", "icon",
    "iconalertexpression", "iconalertstyle", "iconcolor", "iconposition", "iconsize", "id", "init", "interpolate",
    "interpolateboundary", "interpolateextend", "interpolatefill", "interpolatefunction", "interpolateperiod",
    "intervalformat", "is", "join", "key", "keys", "keytagexpression", "label", "labelformat", "last", "lastmarker",
    "lastvaluelabel", "layout", "leftaxis", "leftunits", "legendlastvalue", "legendposition", "legendticks",
    "legendvalue", "limit", "linearzoom", "link", "linkalertexpression", "linkalertsstyle", "linkalertstyle",
    "linkanimate", "linkcolorrange", "linkcolors", "linkdata", "linklabels", "linklabelzoomthreshold", "links",
    "linkthresholds", "linkvalue", "linkwidthorder", "linkwidths", "load", "loadfuturedata", "marker", "markerformat",
    "markers", "max", "maxfontsize", "maximum", "maxrange", "maxrangeforce", "maxrangeright", "maxrangerightforce",
    "maxringwidth", "maxthreshold", "menu", "mergecolumns", "mergecolumnsbatchupdate", "mergefields", "methodpath",
    "metric", "metriclabel", "min", "mincaptionsize", "minfontsize", "minimum", "minorticks", "minrange",
    "minrangeforce", "minrangeright", "minrangerightforce", "minringwidth", "minseverity", "minthreshold", "mode",
    "moving", "movingaverage", "multiple", "multiplecolumn", "multipleseries", "negative", "negativestyle", "node",
    "nodealertexpression", "nodealertstyle", "nodecollapse", "nodecolors", "nodeconnect", "nodedata", "nodelabels",
    "nodelabelzoomthreshold", "noderadius", "noderadiuses", "nodes", "nodethresholds", "nodevalue", "offset",
    "offsetbottom", "offsetleft", "offsetright", "offsettop", "onchange", "onclick", "onseriesclick",
    "onseriesdoubleclick", "options", "origin", "original", "padding", "palette", "paletteticks", "parent", "path",
    "percentile", "percentilemarkers", "percentiles", "period", "periods", "pinradius", "pointerposition", "portal",
    "position", "primarykey", "properties", "range", "rangemerge", "rangeoffset", "rangeselectend", "rangeselectstart",
    "rate", "ratecounter", "ratio", "refresh", "refreshinterval", "reload", "render", "replace", "replaceunderscore",
    "replacevalue", "responsive", "retaintimespan", "retryrefreshinterval", "rightaxis", "ringwidth",
    "rotatelegendticks", "rotatepaletteticks", "rotateticks", "rowalertstyle", "rowstyle", "rule", "scale", "scalex",
    "scaley", "script", "selectormode", "series", "serieslabels", "serieslimit", "seriestype", "seriesvalue", "server",
    "serveraggregate", "severity", "severitystyle", "showtagnames", "size", "sizename", "sort", "source", "stack",
    "start", "starttime", "startworkingminutes", "statistic", "statistics", "stepline", "style", "summarize",
    "summarizeperiod", "summarizestatistic", "svg", "table", "tableheaderstyle", "tag", "tagexpression", "tagoffset",
    "tags", "tagsdropdowns", "tagsdropdownsstyle", "tension", "threshold", "thresholds", "ticks", "ticksright",
    "tickstime", "timeoffset", "timespan", "timezone", "title", "tooltip", "topaxis", "topunits", "totalsize",
    "totalvalue", "transpose", "type", "unscale", "update", "updateinterval", "updatetimespan", "url", "urllegendticks",
    "urlparameters", "value", "verticalgrid", "widgets", "widgetsperrow", "width", "widthunits", "zoomsvg",
];

export const possibleSections: string[] = [
    "column", "configuration", "dropdown", "group", "keys", "link", "node", "option", "other", "placeholders",
    "properties", "property", "series", "tag", "tags", "threshold", "widget",
];
