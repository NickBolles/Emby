﻿var SupporterKeyPage = {

    onPageShow: function () {
        SupporterKeyPage.load(this);
    },

    load: function (page) {

        Dashboard.showLoadingMsg();

        ApiClient.getPluginSecurityInfo().done(function (info) {

            $('#txtSupporterKey', page).val(info.SupporterKey);

            if (info.SupporterKey && !info.IsMBSupporter) {
                page.querySelector('#txtSupporterKey').classList.add('invalidEntry');
                $('.notSupporter', page).show();
            } else {
                page.querySelector('#txtSupporterKey').classList.remove('invalidEntry');
                $('.notSupporter', page).hide();
            }

            Dashboard.hideLoadingMsg();
        });
    },

    updateSupporterKey: function () {

        Dashboard.showLoadingMsg();
        var form = this;

        var key = $('#txtSupporterKey', form).val();

        var info = {
            SupporterKey: key
        };

        ApiClient.updatePluginSecurityInfo(info).done(function () {

            Dashboard.resetPluginSecurityInfo();
            Dashboard.hideLoadingMsg();

            if (key) {

                Dashboard.alert({
                    message: Globalize.translate('MessageKeyUpdated'),
                    title: Globalize.translate('HeaderConfirmation')
                });

            } else {
                Dashboard.alert({
                    message: Globalize.translate('MessageKeyRemoved'),
                    title: Globalize.translate('HeaderConfirmation')
                });
            }

            var page = $(form).parents('.page');

            SupporterKeyPage.load(page);
        });

        return false;
    },

    linkSupporterKeys: function () {

        Dashboard.showLoadingMsg();
        var form = this;

        var email = $('#txtNewEmail', form).val();
        var newkey = $('#txtNewKey', form).val();
        var oldkey = $('#txtOldKey', form).val();

        var info = {
            email: email,
            newkey: newkey,
            oldkey: oldkey
        };

        var url = "http://mb3admin.com/admin/service/supporter/linkKeys";
        Logger.log(url);
        $.post(url, info).done(function (res) {
            var result = JSON.parse(res);
            Dashboard.hideLoadingMsg();
            if (result.Success) {
                Dashboard.alert(Globalize.translate('MessageKeysLinked'));
            } else {
                Dashboard.showError(result.ErrorMessage);
            }
            Logger.log(result);

        });

        return false;
    },

    retrieveSupporterKey: function () {

        Dashboard.showLoadingMsg();
        var form = this;

        var email = $('#txtEmail', form).val();

        var url = "http://mb3admin.com/admin/service/supporter/retrievekey?email=" + email;
        Logger.log(url);
        $.post(url).done(function (res) {
            var result = JSON.parse(res);
            Dashboard.hideLoadingMsg();
            if (result.Success) {
                Dashboard.alert(Globalize.translate('MessageKeyEmailedTo').replace("{0}", email));
            } else {
                Dashboard.showError(result.ErrorMessage);
            }
            Logger.log(result);

        });

        return false;
    }

};

$(document).on('pageshow', "#supporterKeyPage", SupporterKeyPage.onPageShow);

(function () {

    var connectSupporterInfo;

    function showAddUserForm(page) {

        $('.popupAddUser', page).popup('open');

        $('#selectUserToAdd', page).html(connectSupporterInfo.EligibleUsers.map(function (u) {

            return '<option value="' + u.ConnectUserId + '">' + u.Name + '</option>';

        }).join(''));
    }

    function addUser(page, id) {

        Dashboard.showLoadingMsg();

        ApiClient.ajax({
            type: "POST",
            url: ApiClient.getUrl('Connect/Supporters', {
                Id: id
            })

        }).done(function () {

            $('.popupAddUser', page).popup('close');
            loadConnectSupporters(page);
        });
    }

    function removeUser(page, id) {

        Dashboard.confirm(Globalize.translate('MessageConfirmRemoveConnectSupporter'), Globalize.translate('HeaderConfirmRemoveUser'), function (result) {

            if (result) {

                Dashboard.showLoadingMsg();

                ApiClient.ajax({
                    type: "DELETE",
                    url: ApiClient.getUrl('Connect/Supporters', {
                        Id: id
                    })

                }).done(function () {

                    loadConnectSupporters(page);
                });
            }

        });
    }

    function getUserHtml(user) {

        var html = '';

        html += '<li>';
        html += '<a href="#">';
        var imgUrl = user.ImageUrl || 'css/images/userflyoutdefault.png';
        html += '<img src="' + imgUrl + '" />';
        html += '<h3>';
        html += (user.DisplayName || user.Name);
        html += '</h3>';
        html += '<p>';
        html += user.Email;
        html += '</p>';
        html += '</a>';
        html += '<a href="#" data-icon="delete" class="btnRemoveUser" data-id="' + user.Id + '">';
        html += '</a>';
        html += '</li>';

        return html;
    }

    function renderUsers(page, result) {

        $('.linkSupporterKeyMessage', page).html(Globalize.translate('MessageLinkYourSupporterKey', result.MaxUsers));

        var html = '';

        if (result.Users.length) {

            html += '<ul data-role="listview" data-inset="true">';

            html += '<li data-role="list-divider">' + Globalize.translate('HeaderUsers');

            html += result.Users.map(getUserHtml).join('');

            html += '</ul>';
        }

        var elem = $('.supporters', page).html(html).trigger('create');

        $('.btnRemoveUser', elem).on('click', function () {

            removeUser(page, this.getAttribute('data-id'));

        });
    }

    function loadConnectSupporters(page) {

        Dashboard.showLoadingMsg();

        Dashboard.suppressAjaxErrors = true;

        ApiClient.ajax({
            type: "GET",
            url: ApiClient.getUrl('Connect/Supporters'),
            dataType: "json"

        }).done(function (result) {

            connectSupporterInfo = result;
            renderUsers(page, result);

            Dashboard.hideLoadingMsg();

        }).fail(function () {

            $('.supporters', page).html('<p>' + Globalize.translate('MessageErrorLoadingSupporterInfo') + '</p>');

        }).always(function () {

            Dashboard.suppressAjaxErrors = false;

        });

    }

    function loadUserInfo(page) {

        ApiClient.getJSON(ApiClient.getUrl('System/SupporterInfo')).done(function (info) {

            if (info.IsActiveSupporter) {
                $('.supporterContainer', page).addClass('hide');
            } else {
                $('.supporterContainer', page).removeClass('hide');
            }
        });
    }

    $(document).on('pageinit', "#supporterKeyPage", function () {

        var page = this;
        $('#btnAddConnectUser', page).on('click', function () {
            showAddUserForm(page);
        });

        $('#supporterKeyForm').on('submit', SupporterKeyPage.updateSupporterKey);
        $('#lostKeyForm').on('submit', SupporterKeyPage.retrieveSupporterKey);
        $('#linkKeysForm').on('submit', SupporterKeyPage.linkSupporterKeys);
        $('.popupAddUserForm').on('submit', SupporterKeyPage.onAddConnectUserSubmit).on('submit', SupporterKeyPage.onAddConnectUserSubmit);

        $('.benefits', page).html(Globalize.translate('HeaderSupporterBenefit', '<a href="http://emby.media/premiere" target="_blank">', '</a>'));

    }).on('pageshow', "#supporterKeyPage", function () {

        var page = this;
        loadConnectSupporters(page);
        loadUserInfo(page);
    });

    window.SupporterKeyPage.onAddConnectUserSubmit = function () {

        var page = $(this).parents('.page');

        var id = $('#selectUserToAdd', page).val();

        addUser(page, id);

        return false;
    };

})();