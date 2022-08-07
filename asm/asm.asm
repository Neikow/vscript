; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	; lo: 1, go: 1
	push	ebp

	; lo: 2, go: 2
	push	12
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 1 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s4
	call	sprintLF
	mov		eax, _s5
	call	sprint
	mov		eax, [ebp + -6 * 4]
	call	iprintLF
	mov		eax, _s6
	call	sprint
	mov		eax, [ebp + -5 * 4]
	call	iprintLF
	mov		eax, _s7
	call	sprint
	mov		eax, [ebp + -4 * 4]
	call	iprintLF
	mov		eax, _s8
	call	sprint
	mov		eax, [ebp + -3 * 4]
	call	iprintLF
	mov		eax, _s9
	call	sprint
	mov		eax, [ebp + -2 * 4]
	call	iprintLF
	mov		eax, _s10
	call	sprint
	mov		eax, [ebp + -1 * 4]
	call	iprintLF
	mov		eax, _s11
	call	sprint
	mov		eax, [ebp + 0 * 4]
	call	iprintLF
	mov		eax, _s12
	call	sprint
	mov		eax, [ebp + 1 * 4]
	call	iprintLF
	mov		eax, _s13
	call	sprint
	mov		eax, [ebp + 2 * 4]
	call	iprintLF
	mov		eax, _s14
	call	sprint
	mov		eax, [ebp + 3 * 4]
	call	iprintLF
	mov		eax, _s15
	call	sprint
	mov		eax, [ebp + 4 * 4]
	call	iprintLF
	mov		eax, _s16
	call	sprint
	mov		eax, [ebp + 5 * 4]
	call	iprintLF
	mov		eax, _s17
	call	sprint
	mov		eax, [ebp + 6 * 4]
	call	iprintLF
	mov		eax, _s18
	call	sprintLF

	mov		eax, [ebp - 0 * 4]	; (z)
	; lo: 1, go: 1
	push	eax	; arg 0
	; op call
	call	fn_debug_x1
	add		esp, 1 * 4	; removes arguments from stack
	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; debug_x(x: int): void
fn_debug_x1:
	; lo: 1, go: 2
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (str)
	mov		eax, _s2
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (x)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + -1 * 4]	; (z)
	call	iprintLF

	; lo: 0, go: 1
	push	10
	; statement_debug (str)
	mov		eax, _s3
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp - 0 * 4]	; (y)
	call	iprintLF

	; statement_debug (str)
	mov		eax, _s0
	call	sprint

	; statement_debug (str)
	mov		eax, _s1
	call	sprint

	; statement_debug (int)
	mov		eax, [ebp + -1 * 4]	; (z)
	call	iprintLF

	add		esp, 1 * 4
	pop		ebp
	ret

section .data
_s0: db 'z', 0h
_s1: db ', ', 0h
_s2: db 'x', 0h
_s3: db 'y', 0h
_s4: db '>>> begin dump', 0h
_s5: db 'value at [ebp + -6 * 4] : ', 0h
_s6: db 'value at [ebp + -5 * 4] : ', 0h
_s7: db 'value at [ebp + -4 * 4] : ', 0h
_s8: db 'value at [ebp + -3 * 4] : ', 0h
_s9: db 'value at [ebp + -2 * 4] : ', 0h
_s10: db 'value at [ebp + -1 * 4] : ', 0h
_s11: db 'value at [ebp + 0 * 4] : ', 0h
_s12: db 'value at [ebp + 1 * 4] : ', 0h
_s13: db 'value at [ebp + 2 * 4] : ', 0h
_s14: db 'value at [ebp + 3 * 4] : ', 0h
_s15: db 'value at [ebp + 4 * 4] : ', 0h
_s16: db 'value at [ebp + 5 * 4] : ', 0h
_s17: db 'value at [ebp + 6 * 4] : ', 0h
_s18: db '>>> end dump', 0h

section .bss
