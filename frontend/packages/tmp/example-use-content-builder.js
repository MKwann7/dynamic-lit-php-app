const contentBuilderData = {
    container: '.app-main-comp-body .app-page-content-inner',
    imageSelect: null,
    fileSelect: null,
    onImageBrowseClick: function(data) {
        let cardPages = []
        let activeImage = self.contentBuilder.activeImage
        // loads ListImageGalleryWidget
    },
    onImageSelectClick: function(data) {
        let cardPages = []
        // loads ListImageGalleryWidget
    },
    onFileSelectClick: function(data) {
        ezLog(data, "onFileSelectClick")
    },
    assetPath: '/widgets/scripts/assets/',
    fontAssetPath: '/widgets/scripts/assets/fonts/',
    modulePath: '/widgets/scripts/assets/modules/',
    pluginPath: '/widgets/scripts/',
    snippetUrl: '/widgets/scripts/assets/minimalist-blocks/content.js',
    snippetPath: '/widgets/scripts/assets/minimalist-blocks/',
    snippetPathReplace: ['assets/minimalist-blocks/', '/widgets/scripts/assets/minimalist-blocks/'],
    snippetOpen:(this.dashboardTab === "editor"),
    sidePanel:'right',
    plugins: [
        { name: 'preview', showInMainToolbar: true, showInElementToolbar: true },
        { name: 'wordcount', showInMainToolbar: true, showInElementToolbar: true },
        { name: 'symbols', showInMainToolbar: true, showInElementToolbar: false },
        { name: 'buttoneditor', showInMainToolbar: false, showInElementToolbar: false },
    ],
        onChange: function() {
        self.saveContentChanges()
    },
}

this.contentBuilder = new ContentBuilder(contentBuilderData);
this.contentBuilder.loadSnippets('/widgets/scripts/assets/minimalist-blocks/content.js');
this.toggleSnippetList();


toggleSnippetList: function() {
    const self = this
    sessionStorage.setItem("content-builder-active", true)
    let vc = this.findVc(this)

    vc.resizeContentBuilder(50, function(snippetList) {
        if (snippetList === null) return;

        if (self.dashboardTab === "editor") {
            snippetList.style.display = "block";
        } else {
            snippetList.style.display = "none";
        }
    })
}

saveContentHtmlFunc: function() {
    if (this.contentBuilder === null || this.activePage === null) return;
    this.saveChangeCountDownTrigger = false
    this.saveChangeCountDown = 0

    const url = "/cards/card-data/save-card-page-app-content?id=" + this.activePage.card_tab_id;
    const self = this;
    const htmlData = this.contentBuilder.html().replace(/[\t\n]+/, "")

    if (typeof this.activePage === "undefined" || btoa(this.activePage.content) === htmlData) return;

    this.updateActivePageContent(htmlData)

    const htmlFroalaObject = {title: this.activePage.title, content: htmlData, card_id: this.entity.card_id,  card_page_id: this.activePage.card_tab_id, action: this.action};

    ajax.PostExternal(url, htmlFroalaObject, true, function(result) {
        if (result.success === false) {
            let data = {title: "Widget Error", html: "Oh no! There was an error saving the data for this widget: " + objResult.message };
            modal.EngagePopUpAlert(data, function() {
                modal.CloseFloatShield();
            }, 350, 115, true);
            return;
        }

        if (self.action === "create") {
            self.entities.push(result.response.data.card);
        } else {
            self.entities.forEach(function (currEntity, currIndex) {
                if (self.entity.card_tab_id === currEntity.card_tab_id && typeof this.activePage !== "undefined" && this.activePage !== null) {
                    self.entities[currIndex].title = this.activePage.title;
                }
            });
        }
    });
},



function renderTemplate()
{
    return `
        <div>
            <div class="app-page">
                <div v-show="page != null && noTitle === false && customPage === false" class="app-page-title app-page-editor-text-transparent" v-on:click="backToComponent()">
                <a v-show="hasParent" class="back-to-entity-list pointer"></a>
                <span v-if="editor === false">{{ page.title }}</span>
                <span v-if="editor === true"><span class="fas fa-edit"></span><input v-model="page.title" class="app-page-title app-page-editor-text-transparent" v-on:blur="updatePageTitle" /></span>
            </div>
                <div v-show="customPage === false" class="app-page-content">
                    <div class="app-page-content-inner" v-html="renderCardContent"></div>
                </div>
                <div v-show="customPage === true" class="app-page-content">
                    <component ref="dynPageWidgetComponentRef"  :is="dynPageWidgetComponent"></component>
            </div>
            </div>
    </div>
    `;
}