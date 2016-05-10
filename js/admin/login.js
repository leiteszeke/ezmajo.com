$('#loginForm').submit(function(e){
	e.preventDefault();
	loginUser();
})

function loginUser(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/loginUser",
			data: {
				user: $.trim($('#loginUsername').val()),
				pass: $.trim($('#loginPassword').val())
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					location.href = base_url + "admin";
				}else{
					mostrarAlerta(res.message);
				}
			}
		});
	}else{
		mostrarAlerta("Debes completar los campos obligatorios.");
	}
}

function validarCampos(){
	var user = $('#loginUsername');
	var pass = $('#loginPassword');
	var resp = true;

	if($.trim(user.val()) == "" || $.trim(user.val()) == null || $.trim(user.val()) == undefined){
		resp = false;
	}

	if($.trim(pass.val()) == "" || $.trim(pass.val()) == null || $.trim(pass.val()) == undefined){
		resp = false;
	}

	return resp;
}