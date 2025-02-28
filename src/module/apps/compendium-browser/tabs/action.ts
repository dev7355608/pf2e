import { getActionIcon, sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { ActionFilters, CompendiumBrowserIndexData } from "./data";

export class CompendiumBrowserActionTab extends CompendiumBrowserTab {
    override filterData!: ActionFilters;
    override templatePath = "systems/pf2e/templates/compendium-browser/partials/action.hbs";
    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = ["type", "name", "img", "uuid", "traits", "source"];

    protected index = ["img", "system.actionType.value", "system.traits.value", "system.source.value"];

    constructor(browser: CompendiumBrowser) {
        super(browser, "action");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading actions");

        const actions: CompendiumBrowserIndexData[] = [];
        const indexFields = ["img", "system.actionType.value", "system.traits.value", "system.source.value"];
        const sources: Set<string> = new Set();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("action"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - Loading`);
            for (const actionData of index) {
                if (actionData.type === "action") {
                    if (!this.hasAllIndexFields(actionData, indexFields)) {
                        console.warn(
                            `Action '${actionData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // update icons for any passive actions
                    if (actionData.system.actionType.value === "passive") actionData.img = getActionIcon("passive");

                    // Prepare source
                    const source = actionData.system.source.value;
                    if (source) {
                        sources.add(source);
                        actionData.system.source.value = sluggify(source);
                    }
                    actions.push({
                        type: actionData.type,
                        name: actionData.name,
                        img: actionData.img,
                        uuid: `Compendium.${pack.collection}.${actionData._id}`,
                        traits: actionData.system.traits.value,
                        source: actionData.system.source.value,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = actions;

        // Set Filters
        this.filterData.multiselects.traits.options = this.generateMultiselectOptions(CONFIG.PF2E.actionTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading actions");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        // Traits
        const selectedTraits = multiselects.traits.selected.map((s) => s.value);
        if (selectedTraits.length > 0 && !selectedTraits.every((t) => entry.traits.includes(t))) {
            return false;
        }
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): void {
        this.filterData = {
            checkboxes: {
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
            },
            multiselects: {
                traits: {
                    label: "PF2E.BrowserFilterTraits",
                    options: [],
                    selected: [],
                },
            },
            order: {
                by: "name",
                direction: "asc",
                options: {
                    name: "PF2E.BrowserSortyByNameLabel",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
