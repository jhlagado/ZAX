; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_reg16 begin
byte_fvar_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
ex DE, HL                      ; 0113: EB
push DE                        ; 0114: D5
push IX                        ; 0115: DD E5
pop HL                         ; 0117: E1
ld DE, $0004                   ; 0118: 11 04 00
add HL, DE                     ; 011B: 19
pop DE                         ; 011C: D1
add HL, DE                     ; 011D: 19
push HL                        ; 011E: E5
pop HL                         ; 011F: E1
ld A, (hl)                     ; 0120: 7E
push AF                        ; 0121: F5
ex DE, HL                      ; 0122: EB
push DE                        ; 0123: D5
push IX                        ; 0124: DD E5
pop HL                         ; 0126: E1
ld DE, $0004                   ; 0127: 11 04 00
add HL, DE                     ; 012A: 19
pop DE                         ; 012B: D1
add HL, DE                     ; 012C: 19
push HL                        ; 012D: E5
pop HL                         ; 012E: E1
ld (hl), A                     ; 012F: 77
pop AF                         ; 0130: F1
ld H, $0000                    ; 0131: 26 00
ld L, A                        ; 0133: 6F
__zax_epilogue_0:
pop DE                         ; 0134: D1
pop BC                         ; 0135: C1
pop AF                         ; 0136: F1
ld SP, IX                      ; 0137: DD F9
pop IX                         ; 0139: DD E1
ret                            ; 013B: C9
; func byte_fvar_reg16 end
; func main begin
main:
push IX                        ; 013C: DD E5
ld IX, $0000                   ; 013E: DD 21 00 00
add IX, SP                     ; 0142: DD 39
push AF                        ; 0144: F5
push BC                        ; 0145: C5
push DE                        ; 0146: D5
push HL                        ; 0147: E5
ld HL, $0006                   ; 0148: 21 06 00
push HL                        ; 014B: E5
ld HL, glob_bytes              ; 014C: 21 00 00
push HL                        ; 014F: E5
call byte_fvar_reg16           ; 0150: CD 00 00
inc SP                         ; 0153: 33
inc SP                         ; 0154: 33
inc SP                         ; 0155: 33
inc SP                         ; 0156: 33
__zax_epilogue_1:
pop HL                         ; 0157: E1
pop DE                         ; 0158: D1
pop BC                         ; 0159: C1
pop AF                         ; 015A: F1
ld SP, IX                      ; 015B: DD F9
pop IX                         ; 015D: DD E1
ret                            ; 015F: C9
; func main end

; symbols:
; label byte_fvar_reg16 = $0100
; label __zax_epilogue_0 = $0134
; label main = $013C
; label __zax_epilogue_1 = $0157
; data glob_bytes = $2000
; label __zax_startup = $2008
