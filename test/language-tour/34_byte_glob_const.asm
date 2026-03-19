; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_glob_const begin
byte_glob_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push AF                        ; 010B: F5
ld A, (glob_bytes + 1)         ; 010C: 3A 00 00
ld (glob_bytes + 2), A         ; 010F: 32 00 00
pop AF                         ; 0112: F1
ld A, (glob_bytes + 1)         ; 0113: 3A 00 00
ld H, $0000                    ; 0116: 26 00
ld L, A                        ; 0118: 6F
__zax_epilogue_0:
pop DE                         ; 0119: D1
pop BC                         ; 011A: C1
pop AF                         ; 011B: F1
ld SP, IX                      ; 011C: DD F9
pop IX                         ; 011E: DD E1
ret                            ; 0120: C9
; func byte_glob_const end
; func main begin
main:
push IX                        ; 0121: DD E5
ld IX, $0000                   ; 0123: DD 21 00 00
add IX, SP                     ; 0127: DD 39
push AF                        ; 0129: F5
push BC                        ; 012A: C5
push DE                        ; 012B: D5
push HL                        ; 012C: E5
call byte_glob_const           ; 012D: CD 00 00
__zax_epilogue_1:
pop HL                         ; 0130: E1
pop DE                         ; 0131: D1
pop BC                         ; 0132: C1
pop AF                         ; 0133: F1
ld SP, IX                      ; 0134: DD F9
pop IX                         ; 0136: DD E1
ret                            ; 0138: C9
; func main end

; symbols:
; label byte_glob_const = $0100
; label __zax_epilogue_0 = $0119
; label main = $0121
; label __zax_epilogue_1 = $0130
; data glob_bytes = $2000
; label __zax_startup = $2008
