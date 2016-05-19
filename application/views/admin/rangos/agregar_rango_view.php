<!DOCTYPE html>
<html>
	<head>
		{head}
	</head>
	<body class="hold-transition skin-blue sidebar-mini">
		<div class="wrapper">
			{header}
			{sidebar}
			<div class="content-wrapper">
				<section class="content-header">
					<h1>Rangos <small>Nuevo Rango</small></h1>
				</section>
				<section class="content">
					<form class="form" id="rankForm" method="post">
						<div class="form-group">
							<label class="control-label" for="rankName">Nombre del Rango</label>
							<input class="form-control" type="text" name="rankName" id="rankName" />
						</div>
						<div class="form-group text-right">
							<button type="submit" class="btn btn-sm btn-primary"><i class="fa fa-sign-in"></i>&nbsp;Crear</button>
						</div>
					</form>
				</section>
			</div>
			{footer}
		</div>
		<script type="text/javascript" src="{base_url}js/admin/ranks.js"></script>
	</body>
</html>