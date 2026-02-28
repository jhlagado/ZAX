; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_fvar_const begin
byte_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld A, (IX+$06)                 ; 010B: DD 7E 06
push AF                        ; 010E: F5
push DE                        ; 010F: D5
push IX                        ; 0110: DD E5
pop HL                         ; 0112: E1
ld DE, $0007                   ; 0113: 11 07 00
add HL, DE                     ; 0116: 19
push HL                        ; 0117: E5
pop DE                         ; 0118: D1
ld (hl), A                     ; 0119: 77
pop AF                         ; 011A: F1
ld H, $0000                    ; 011B: 26 00
ld L, A                        ; 011D: 6F
__zax_epilogue_0:
pop DE                         ; 011E: D1
pop BC                         ; 011F: C1
pop AF                         ; 0120: F1
ld SP, IX                      ; 0121: DD F9
pop IX                         ; 0123: DD E1
ret                            ; 0125: C9
; func byte_fvar_const end
; func main begin
main:
push IX                        ; 0126: DD E5
ld IX, $0000                   ; 0128: DD 21 00 00
add IX, SP                     ; 012C: DD 39
push AF                        ; 012E: F5
push BC                        ; 012F: C5
push DE                        ; 0130: D5
push HL                        ; 0131: E5
ld HL, glob_bytes              ; 0132: 21 00 00
push HL                        ; 0135: E5
call byte_fvar_const           ; 0136: CD 00 00
inc SP                         ; 0139: 33
inc SP                         ; 013A: 33
__zax_epilogue_1:
pop HL                         ; 013B: E1
pop DE                         ; 013C: D1
pop BC                         ; 013D: C1
pop AF                         ; 013E: F1
ld SP, IX                      ; 013F: DD F9
pop IX                         ; 0141: DD E1
ret                            ; 0143: C9
; func main end

; symbols:
; label byte_fvar_const = $0100
; label __zax_epilogue_0 = $011E
; label main = $0126
; label __zax_epilogue_1 = $013B
; data glob_bytes = $2000
