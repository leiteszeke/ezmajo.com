$('#recoverForm').submit(function(e){
	e.preventDefault();
	recoverUser();
})

function recoverUser(){
	if(validarCampos()){
		$.ajax({
			url: base_url + "_admajax/recoverUser",
			data: {
				user: $.trim($('#recoverUsername').val())
			},
			type: 'POST',
			success: function(res){
				res = $.parseJSON(res);

				if(!res.error){
					mostrarAlerta(res.message);
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
	var user = $('#recoverUsername');
	var resp = true;

	if($.trim(user.val()) == "" || $.trim(user.val()) == null || $.trim(user.val()) == undefined){
		resp = false;
	}

	return resp;
}