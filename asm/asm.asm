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
	push	ebp

	mov		eax, esp	; save struct base pointer
	sub		eax, 4
	push	_s0
	push	11
	push	5
	push	1
	push	2
	push	eax	; (player)

	; statement_debug (struct)
	push	ebx
	mov		ebx, eax
	mov		eax, _s1
	call	sprint
	mov		eax, _s2
	call	sprintLF
	mov		eax, _s3
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, [ebx - 0]
	call	sprintLF
	mov		eax, _s5
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, _s6
	call	sprint
	mov		eax, _s2
	call	sprintLF
	mov		eax, _s7
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, [ebx - 4]
	call	iprintLF
	mov		eax, _s8
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, [ebx - 8]
	call	iprintLF
	mov		eax, _s9
	call	sprintLF
	mov		eax, _s10
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, _s11
	call	sprint
	mov		eax, _s2
	call	sprintLF
	mov		eax, _s7
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, [ebx - 12]
	call	iprintLF
	mov		eax, _s8
	call	sprint
	mov		eax, _s4
	call	sprint
	mov		eax, [ebx - 16]
	call	iprintLF
	mov		eax, _s9
	call	sprintLF
	mov		eax, _s12
	call	sprintLF
	pop		ebx

	mov		ebx, 0	; exit code
	call	_exit

section .data
_s0: db 'Bob', 0h
_s1: db 'Player', 0h
_s2: db '{', 0h
_s3: db '  name', 0h
_s4: db ': ', 0h
_s5: db '  pos', 0h
_s6: db 'Position', 0h
_s7: db '    x', 0h
_s8: db '    y', 0h
_s9: db '  }', 0h
_s10: db '  vel', 0h
_s11: db 'Velocity', 0h
_s12: db '}', 0h
