<aside class="main-sidebar">
    <section class="sidebar">
      	<div class="user-panel">
        	<div class="pull-left image">
          		<img src="{base_url}dist/img/user2-160x160.jpg" class="img-circle" alt="Imagen de Perfil de {log_nombre} {log_apellido}">
        	</div>
        	<div class="pull-left info">
          		<p>{log_nombre} {log_apellido}</p>
          		<!-- <a href="#"><i class="fa fa-circle text-success"></i> Online</a> -->
          		<p>{log_rango}</p>
        	</div>
      	</div>
      	<form action="#" method="get" class="sidebar-form">
        	<div class="input-group">
          		<input type="text" name="q" class="form-control" placeholder="Buscar...">
              	<span class="input-group-btn">
               		<button type="submit" name="search" id="search-btn" class="btn btn-flat"><i class="fa fa-search"></i></button>
              	</span>
        	</div>
      	</form>
      	{menu}
    </section>
</aside>