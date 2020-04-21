console.debug('- wykop extra extension -');

we_articles = {}
count_articles_visible = 0
hide_reason = 'ind'

icons_font_url = browser.runtime.getURL("assets/we-icons.ttf")
icons_font = new FontFace('we-icons', 'url(' + icons_font_url + ')');
icons_font.load().then(function(loaded_face) {
    document.fonts.add(loaded_face)
    console.debug('icons font loaded')
}).catch(function(error) {
    console.debug(error)
    console.debug('icons font loading failed')
});

function scrollToFirstUnread() {
    $($('.we-icon-toggle-off').get(0)).parents('li').get(0).scrollIntoView();
}

function generateTooltip(e) {
    console.log(e)
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
    $('#we_count').html('Widocznych wykopów: ' + count_articles_visible)
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

function markArticleVisited(e) {
    el = $(e.currentTarget)
    li = el.parents('li')
    article = li.find('.article')
    id = article.attr('data-id')
    update = false
    if (!isArticleVisited(id)) {
        li.find('.we-a-info').before('<a class="we-a-vis we-button"><span class="we-icon-eye"></span><a>')
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
        li.find('.we-a-info').before('<a class="we-a-vis we-button"><span class="we-icon-eye"></span><a>')
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
        id = $(el).attr('data-id')
        if (!(id in we_articles)) {
            console.debug('new article id: ' + id)
            we_articles[id] = {}
            we_articles[id]['firstseen_ts'] = ts
            we_articles[id]['firstseen_loc'] = loc
        }
    })
    browser.storage.local.set({ 'we_articles': we_articles })    
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
    browser.storage.local.set({ 'we_articles': we_articles })
}

function articleUnset(id, property) {
    if (!(id in we_articles)) {
        return
    }
    delete(we_articles[id][property])
    browser.storage.local.set({ 'we_articles': we_articles })
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
        li = el.parents('li')
        id = el.attr('data-id')
        el.parent().find('a').attr("target","_blank")
        a = el.parent().find('h2 a')
        visited = ''
        if (isArticleVisited(id)) {
            visited = '<a class="we-a-vis we-button"><span class="we-icon-eye"></span><a>'
        }
        if (isArticleFav(id)) {
            li.addClass('we-fav')
            fav_icon = 'we-icon-star'
        } else {
            fav_icon = 'we-icon-star-o'
        }
        if (isArticleHidden(id)) {
            if (el.hasClass('article') || el.hasClass('wblock')) {
                el.parent().prepend('<div style="text-align:right">&nbsp;<span class="we-content">&nbsp;</span>' + visited + '<a class="we-a-info we-button"><span class="we-icon-info tooltip"><span class="tooltiptext">Tooltip text</span></span></a><a class="we-a-fav we-button"><span class="' + fav_icon + '"></span></a><a class="we-a-on-off we-button"><span class="we-icon-toggle-on"></span></a></div>')
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
            }
        } else {
            if (el.hasClass('article') || el.hasClass('wblock')) {
                el.parent().prepend('<div style="text-align:right">&nbsp;<span class="we-content">&nbsp;</span>' + visited + '<a class="we-a-info we-button"><span class="we-icon-info tooltip"><span class="tooltiptext">Tooltip text</span></span></a><a class="we-a-fav we-button"><span class="' + fav_icon + '"></span></a><a class="we-a-on-off we-button"><span class="we-icon-toggle-off"></span></a></div>')
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
        }
    })
    updateArticlesVisible()
    console.debug('processing articles finished')
    $('.fix-tagline a[title="Otwórz źródło znaleziska"]').on('click', markArticleVisited)
    $('h2 a').on('click', markArticleVisited)
    $('div.article a.ajax').on('click', markArticleVisited)
    $('.row.elements a.affect').on('click', markArticleVisited)
    $('.tooltip').hover(generateTooltip, null)
    $('#we_count').on('click', scrollToFirstUnread)
    $('#we_hide_all').on('click', hideAllArticles)
    $('#we_show_all').on('click', showAllArticles)
    $('#itemsStream').prepend($('.pager').clone())
}

function getDataFromStorage(result) {
    console.debug('got from local storage: ', result)
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
    console.debug('Error: ${error}');
}

function init() {
    //$('.mainnav').append('<li id="we_count"></li><li id=we_hide_all>HIDE ALL</li><li id=we_show_all>SHOW ALL</li>')
    getting = browser.storage.local.get(["we_articles"])
    getting.then(getDataFromStorage, onError)
}

init();