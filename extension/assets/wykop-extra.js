console.debug('- wykop extra extension -');

storage_changes_made = false
we_articles = {}
count_articles_visible = 0
hide_reason = 'ind'
new_articles = 0

is_mobile=/Mobi|Android/i.test(navigator.userAgent)

we_button = 'we-button'
if (is_mobile) {
    we_button = 'we-button we-mobile-size'
}

icons_font_url = browser.runtime.getURL("assets/we-icons.ttf")
icons_font = new FontFace('we-icons', 'url(' + icons_font_url + ')');
icons_font.load().then(function(loaded_face) {
    document.fonts.add(loaded_face)
    console.debug('icons font loaded')
}).catch(function(error) {
    console.debug(error)
    console.debug('icons font loading failed')
});

function syncStorage() {
    console.debug('checking if storage needs to be synced')
    if (storage_changes_made) {
        console.debug('syncing storage')
        browser.storage.sync.set({ 'we_articles': we_articles })
        storage_changes_made = false
    }
}

function scrollToFirstUnread() {
    $($('.we-icon-toggle-off').get(0)).parents('li').get(0).scrollIntoView();
}

function generateTooltip(e) {
    if (e.type == 'mouseenter') {
        el = $(e.currentTarget)
        li = el.parents('li')
        article = li.find('.article')
        id = article.attr('data-id')
        tooltip = ''
        if (!id in we_articles) {
            return
        }
        tooltip = ''
        if (we_articles[id]['firstseen_ts']) {
            tooltip += '<b>Pierwszy raz widziano:</b><br>' + formatDateTime(we_articles[id]['firstseen_ts']) + ' (' + locationToTxt(we_articles[id]['firstseen_loc']) + ')<br><br>'
        }
        if (we_articles[id]['fav']) {
            tooltip += '<b>Polubiono:</b><br>' + formatDateTime(we_articles[id]['fav_ts']) + ' (' + locationToTxt(we_articles[id]['fav_loc']) + ')<br><br>'
        }
        if (we_articles[id]['visited']) {
            tooltip += '<b>Odwiedzono:</b><br>' + formatDateTime(we_articles[id]['visited_ts']) + ' (' + locationToTxt(we_articles[id]['visited_loc']) + ')<br><br>'
        }
        if (we_articles[id]['hidden']) {
            reason = 'kilk'
            if ('hidden_reason' in we_articles[id]) {
                txt= 'klik'
                if (we_articles[id]['hidden_reason'] == 'all') {
                    txt = 'wszystko'
                }
                reason = ' (' + txt + ')'
            }
            tooltip += '<b>Ukryto:</b><br>' + formatDateTime(we_articles[id]['hidden_ts']) + ' (' + locationToTxt(we_articles[id]['hidden_loc']) + ')' + reason + '<br><br>'
        }
        tooltip = tooltip.substring(0, tooltip.length - 8)
        el.find('.tooltiptext').html(tooltip)
    }
}

function showAllArticles() {
    $('.we-icon-toggle-on').parent().each(function(id, el) { 
        el.click() 
    })
}


function hideAllArticles() {
    $('.we-icon-toggle-off').parent().each(function(id, el) { 
        hide_reason = 'all'
        el.click() 
        hide_reason = 'ind'
    })
}

function updateArticlesVisible() {
    val = count_articles_visible
    if (val < 0) {
        val = 0
    }
    $('#we_count_visible').html('widocznych wykopów: ' + val)
    if (val > 0) {
        $('#we_count_visible').css('color', '#FFF454')
    } else {
        $('#we_count_visible').css('color', '')
    }
}

function dtPad(val) {
    if (val < 10) {
        return "0" + val
    }
    return val
}

function formatDateTime(ts) {
    date = new Date(ts * 1000)
    str = date.getFullYear() + '-' + dtPad(date.getMonth() + 1) + '-' + dtPad(date.getDate()) + ' ' + dtPad(date.getHours()) + ':' + dtPad(date.getMinutes()) + ':' + dtPad(date.getSeconds())
    return str
}

// doesn't work well so commented out
function updateArticleDigg(e) {
    console.log('here')
    debugger;
    el = $(e.currentTarget)
    li = el.parents('li')
    article = li.find('.article')
    diggbox = li.find('.diggbox')
    if (diggbox.hasClass('digout')) {
        li.find('.we-a-digg').remove()
    } else if (diggbox.hasClass('burried')) {
        li.find('.we-a-info').before('<a class="we-a-digg ' + we_button + '"><span class="we-icon-digg-down"></span><a>')
    } else {
        li.find('.we-a-info').before('<a class="we-a-digg ' + we_button + '"><span class="we-icon-digg-up"></span><a>')
    }
}

function markArticleVisited(e) {
    el = $(e.currentTarget)
    li = el.parents('li')
    article = li.find('.article')
    id = article.attr('data-id')
    update = false
    if (!isArticleVisited(id)) {
        li.find('.we-a-info').before('<a class="we-a-vis ' + we_button + '"><span class="we-icon-eye-yellow"></span><a>')
        articleSet(id, 'visited', 1)
    }
    if (!isArticleHidden(id) && !el.hasClass('ajax')) {
        articleVisiblity(e, 'hide')
    }
}

function markMikroVisited(e) {
    el = $(e.currentTarget)
    li = el.parents('li')
    block = li.find('.wblock')
    id = block.attr('data-id')
    update = false
    if (!isArticleVisited(id)) {
        li.find('.we-a-info').before('<a class="we-a-vis ' + we_button + '"><span class="we-icon-eye-yellow"></span><a>')
        articleSet(id, 'visited', 1)
    }
    if (!isArticleHidden(id)) {
        mikroVisiblity(e, 'hide')
    }
}

function articleSwitchFav(e) {
    el = $(e.currentTarget)    
    li = el.parents('li')
    article = li.find('.article')
    id = article.attr('data-id')
    if (isArticleFav(id)) {
        articleUnsetFav(e)
    } else {
        articleSetFav(e)
    }
}

function articleSetFav(e) {
    el = $(e.currentTarget)
    li = el.parents('li')
    li.addClass('we-fav')
    el.find('span').removeClass('we-icon-star-o').addClass('we-icon-star')
    articleSet(id, 'fav', 1)
}

function articleUnsetFav(e) {
    el = $(e.currentTarget)
    li = el.parents('li')
    li.removeClass('we-fav')
    el.find('span').removeClass('we-icon-star').addClass('we-icon-star-o')
    articleUnset(id, 'fav')
}

function articleHide(e) {
    articleVisiblity(e, 'hide')
}

function articleShow(e) {
    articleVisiblity(e, 'show')
}

function articleVisiblity(e, op) {
    el = $(e.currentTarget)
    li = el.parents('li')
    article = li.find('.article')
    id = article.attr('data-id')
    on_off = li.find('.we-a-on-off')
    if (op == 'hide') {
        closeEmbed=article.find('.closeEmbed')
        if (closeEmbed.length) {
            closeEmbed[0].click()
        }
        a = article.find('h2 a')
        li.find('.we-content').prepend(a.parent().html())
        li.find('.we-content a').on('click', markArticleVisited)
        on_off = li.find('.we-a-on-off')
        on_off.unbind()
        on_off.on('click', articleShow)
        on_off.find('span').removeClass('we-icon-toggle-off').addClass('we-icon-toggle-on')
        article.hide()
        articleSet(id, 'hidden', 1)
        if (el.hasClass('we-a-on-off')) {
            moveToNextToogleOff(el)
        }
        count_articles_visible--
    } else {
        li.find('.we-content').html('')
        on_off.unbind()
        on_off.on('click', articleHide)
        on_off.find('span').removeClass('we-icon-toggle-on').addClass('we-icon-toggle-off')
        article.show()
        articleUnset(id, 'hidden')
        count_articles_visible++
    }
    updateArticlesVisible()
}

function mikroHide(e) {
    mikroVisiblity(e, 'hide')
}

function mikroShow(e) {
    mikroVisiblity(e, 'show')
}

function mikroVisiblity(e, op) {
    el = $(e.currentTarget)
    obj = el.parent().parent().find('.wblock')
    id = obj.attr('data-id')
    if (op == 'hide') {
        link = obj.find('div.author').find('a').eq(1).clone()
        link.html('mikro: ' + link.attr('href'))
        el.parent().find('.we-content').prepend(link)
        el.parent().find('.we-content a').on('click', markArticleVisited)
        el.unbind()
        el.on('click', mikroShow)
        el.find('span').removeClass('we-icon-toggle-off').addClass('we-icon-toggle-on')      
        obj.hide()
        articleSet(id, 'hidden', 1)
    } else {
        el.parent().find('span').html('')
        el.unbind()
        el.on('click', mikroHide)
        el.find('span').removeClass('we-icon-toggle-on').addClass('we-icon-toggle-off')      
        obj.show()
        articleUnset(id, 'hidden')
    }
}

function resolveLoc() {
    loc = 'unk'
    if (/wykop.pl\/strona\//.test(document.baseURI)) {
        loc = 'main'
    } else if (/wykop.pl\/?$/.test(document.baseURI)) {
        loc = 'main'
    } else if (/wykop.pl\/wykopalisko\//.test(document.baseURI)) {
        loc = 'wyk'
    } else if (/wykop.pl\/aktywne\//.test(document.baseURI)) {
        loc = 'act'
    }
    return loc    
}

function locationToTxt(loc) {
    if (loc == 'unk') {
        return 'nieznana'
    }
    if (loc == 'main') {
        return 'główna'
    }
    if (loc == 'wyk') {
        return 'wykopalisko'
    }
    if (loc == 'act') {
        return 'aktywne'
    }
    return '?'
}

function articlesInit() {
    console.debug('initializing articles')
    ts = Math.floor(Date.now() / 1000)
    loc = resolveLoc()
    $('[data-id]').each(function(id, el) {
        el = $(el)
        if (!el.is(":visible")) {
            return
        }
        id = el.attr('data-id')
        if (!(id in we_articles)) {
            console.debug('new article id: ' + id)
            new_articles++
            el.attr('we-article-new', 1)
            we_articles[id] = {}
            we_articles[id]['firstseen_ts'] = ts
            we_articles[id]['firstseen_loc'] = loc
            storage_changes_made = true
        }
    })
    $('#we_count_new').html('nowych wykopów: ' + new_articles)   
}

function articleSet(id, property, value) {
    if (!(id in we_articles)) {
        we_articles[id] = {}
    }
    we_articles[id][property] = value
    we_articles[id][property + '_ts'] = Math.floor(Date.now() / 1000)
    we_articles[id][property + '_loc'] = resolveLoc()
    if (property == 'hidden') {
        we_articles[id][property + '_reason'] = hide_reason
    }
    storage_changes_made = true
}

function articleUnset(id, property) {
    if (!(id in we_articles)) {
        return
    }
    delete(we_articles[id][property])
    storage_changes_made = true
}

function isArticleVisited(id) {
    if (!(id in we_articles)) {
        return false
    }
    if (we_articles[id]['visited'] == 1) {
        return true
    }
    return false
}

function isArticleHidden(id) {
    if (!(id in we_articles)) {
        return false
    }
    if (we_articles[id]['hidden'] == 1) {
        return true
    }
    return false
}

function isArticleFav(id) {
    if (!(id in we_articles)) {
        return false
    }
    if (we_articles[id]['fav'] == 1) {
        return true
    }
    return false
}

function processArticlesOnLoad() {
    articlesInit()
    console.debug('processing articles start')
    $('[data-id]').each(function(num, el) {
        el = $(el)

        if (!(el.hasClass('article') || el.hasClass('wblock'))) {
            return;
        }

        if (!el.is(":visible")) {
            return;
        }

        li = el.parents('li')
        id = el.attr('data-id')
        el.parent().find('a').attr("target","_blank")
        a = el.parent().find('h2 a')
        visited = ''
        if (isArticleVisited(id)) {
            visited = '<a class="we-a-vis ' + we_button + '"><span class="we-icon-eye-yellow"></span><a>'
        }

        we_icon = 'we-icon-info'
        if (el.attr('we-article-new') == 1) {
            we_icon = 'we-icon-info-new'
        }        
        diggbox = el.find('.diggbox')
        digg = ''
        if (diggbox.hasClass('burried')) {
            digg = '<a class="we-a-digg ' + we_button + '"><span class="we-icon-digg-down"></span><a>'
        } else if (diggbox.hasClass('digout')) {
            digg = '<a class="we-a-digg ' + we_button + '"><span class="we-icon-digg-up"></span><a>'
        }
        if (isArticleFav(id)) {
            li.addClass('we-fav')
            fav_icon = 'we-icon-star'
        } else {
            fav_icon = 'we-icon-star-o'
        }
        on_off_icon = 'we-icon-toggle-off'
        if (isArticleHidden(id)) {
            on_off_icon = 'we-icon-toggle-on'
        }
        if (is_mobile) {
            toolbar = '<div style="text-align:right">&nbsp;' + visited + '' + digg + '<a class="we-a-info we-button we-mobile-size"><span class="' + we_icon + ' tooltip"><span class="tooltiptext">Tooltip text</span></span></a><a class="we-a-fav we-button we-mobile-size"><span class="' + fav_icon + '"></span></a><a class="we-a-on-off we-button we-mobile-size"><span class="'+ on_off_icon +'"></span></a><br><div class="we-content we-content-mobile">&nbsp;</div></div>'
        } else {
            toolbar = '<div style="text-align:right">&nbsp;<span class="we-content">&nbsp;</span>' + visited + '' + digg + '<a class="we-a-info we-button"><span class="' + we_icon + ' tooltip"><span class="tooltiptext">Tooltip text</span></span></a><a class="we-a-fav we-button"><span class="' + fav_icon + '"></span></a><a class="we-a-on-off we-button"><span class="'+ on_off_icon +'"></span></a></div>'
        }

        el.parent().prepend(toolbar)
        if (isArticleHidden(id)) {
            if (el.hasClass('article')) {
                el.parent().find('.we-content').html(a.parent().html())
                el.parent().find('.we-a-on-off').on('click', articleShow)
            } else {
                link = el.find('div.author').find('a').eq(1).clone()
                link.html('mikro: ' + link.attr('href'))
                el.parent().find('.we-content').prepend(link)
                el.parent().find('.we-a-on-off').on('click', mikroShow)
            }
            el.parent().find('.we-content a').on('click', markArticleVisited)
            el.parent().find('.we-a-fav').on('click', articleSwitchFav)
            el.hide()
        } else {
            if (el.hasClass('article')) {
                el.parent().find('.we-a-on-off').on('click', articleHide)
                el.parent().find('.we-a-fav').on('click', articleSwitchFav)
                if (el.is(":visible")) {
                    count_articles_visible++
                }
            } else {
                el.parent().find('.we-a-on-off').on('click', mikroHide)
                el.find('div.author').children().eq(1).on('click', markMikroVisited)
            }
        }
    })
    updateArticlesVisible()
    console.debug('processing articles finished')
    $('.fix-tagline a[title="Otwórz źródło znaleziska"]').on('click', markArticleVisited)
    $('h2 a').on('click', markArticleVisited)
    $('div.diggbox a').on('click', updateArticleDigg)
    $('div.article .media-content a').on('click', markArticleVisited)
    $('.row.elements a.affect').on('click', markArticleVisited)
    $('.tooltip').hover(generateTooltip, null)
    $('#we_count').on('click', scrollToFirstUnread)
    $('#we_hide_all').on('click', hideAllArticles)
    $('#we_show_all').on('click', showAllArticles)
    $('#itemsStream').prepend($('.pager').clone())
}

function getDataFromStorage(result) {
    //console.debug('got from storage: ', result)
    if (result.we_articles) {
        we_articles = result.we_articles
    } else {
        we_articles = {}
    }
    processArticlesOnLoad()
}

function moveToNextToogleOff(currentElement) {
    elements = {}
    $('.we-icon-toggle-off').each(function(id, el) {
        parent = $(el).parent()
        elements[Math.round(parent.offset().top)] = parent
    })
    element = 0
    currentPos = currentElement.offset().top
    for (var i in elements) {
        if (i > currentPos) {
            element = elements[i]
            break
        }
    }
    if (element) {
        offset = element.offset().top - currentPos
        window.scrollBy(0, offset)
    }
}

function onError(error) {
    console.debug('Error: ' + error);
}

function init() {
    $('#nav').prepend('<div class="clearfix m-reset-position" style="background:#2c2c2c"><span id="we_count_new" class="we-button-top">nowych wykopów: -</span><span id="we_count_visible" class="we-button-top">widocznych wykopów: -</span><span class="we-button-top" id=we_hide_all><span class="we-icon-eye-slash"></span></span><span class="we-button-top" id=we_show_all><span class="we-icon-eye"></span></span></div>')
    $('#site').css('padding-top', '84px')
    getting = browser.storage.sync.get(["we_articles"])
    getting.then(getDataFromStorage, onError)
    setInterval(syncStorage, 60000)
    $(window).bind('beforeunload', function(){
        console.debug('page exit')
        syncStorage()
    });
    $(document).ready(function() {
        $("img.lazy").each(function(num, el) {
           $(el).attr('src', $(el).data('original'))
        })
    });
}

if (/wykop.pl\/link\//.test(document.baseURI)) {
    console.log('wykop extra - just article page')
} else {
    init();
}
