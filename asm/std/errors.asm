throw:
  ret

err_base:
  ret

err_out_of_bounds:
  mov		rcx, 10
	call	exit
  ret